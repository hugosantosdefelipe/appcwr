import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Estados de seguimiento del numero de catalogo en SGAE
const ESTADOS = [
  'No pedido',
  'Pedido sin numero',
  'Con numero',
  'Renunciado',
  'En conflicto',
] as const;
type Estado = (typeof ESTADOS)[number];

const SORT_COLUMNS = ['editor', 'ipi', 'obras', 'estado', 'tipo_catalogo', 'peer', 'numero_catalogo', 'fecha_peticion'] as const;

/**
 * Refresca la lista de editores controlados a partir de cwr_obras.
 *
 * Un editor se considera controlado si aparece como publisher en al menos una
 * cadena distinta de la Z. Anade los editores nuevos y recalcula el contador de
 * obras, sin tocar las columnas de seguimiento (estado, numero_catalogo,
 * fecha_peticion, notas), que se rellenan a mano.
 */
const REFRESH_SQL = `
  INSERT INTO editores_sgae (editor, obras)
  SELECT jt.pubname, COUNT(DISTINCT s.concord_code)
  FROM cwr_obras s,
  JSON_TABLE(s.copyright_chains, '$[*]' COLUMNS (
      chain_id VARCHAR(8)   PATH '$.id',
      pubname  VARCHAR(255) PATH '$.publisher.name'
  )) jt
  WHERE s.copyright_chains IS NOT NULL
    AND COALESCE(jt.chain_id, '') <> 'Z'
    AND jt.pubname IS NOT NULL AND jt.pubname <> ''
  GROUP BY jt.pubname
  ON DUPLICATE KEY UPDATE obras = VALUES(obras)
`;

interface EditorRow {
  editor: string;
  ipi: string | null;
  obras: number;
  estado: Estado;
  tipo_catalogo: string | null;
  peer: string | null;
  numero_catalogo: string | null;
  fecha_peticion: string | null;
  notas: string | null;
}

interface CountRow {
  total: number;
}

interface StatRow {
  estado: Estado;
  n: number;
  obras: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const estado = searchParams.get('estado')?.trim() || '';
    const sortBy = searchParams.get('sortBy') || 'obras';
    const sortOrder = searchParams.get('sortOrder')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const safeSortBy = (SORT_COLUMNS as readonly string[]).includes(sortBy) ? sortBy : 'obras';
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const filterParams: unknown[] = [];

    if (search) {
      conditions.push('(editor LIKE ? OR ipi LIKE ? OR numero_catalogo LIKE ? OR notas LIKE ?)');
      const pattern = `%${search}%`;
      filterParams.push(pattern, pattern, pattern, pattern);
    }

    if (estado && (ESTADOS as readonly string[]).includes(estado)) {
      conditions.push('estado = ?');
      filterParams.push(estado);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataSql = `
      SELECT editor, ipi, obras, estado, tipo_catalogo, peer, numero_catalogo,
             DATE_FORMAT(fecha_peticion, '%Y-%m-%d') AS fecha_peticion, notas
      FROM editores_sgae
      ${whereSql}
      ORDER BY ${safeSortBy} ${sortOrder}, editor ASC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) AS total FROM editores_sgae ${whereSql}`;

    // Los totales por estado son globales, no dependen del filtro activo
    const statsSql = `
      SELECT estado, COUNT(*) AS n, SUM(obras) AS obras
      FROM editores_sgae GROUP BY estado
    `;

    const [editores, countResult, statRows] = await Promise.all([
      query<EditorRow[]>(dataSql, [...filterParams, limit, offset]),
      query<CountRow[]>(countSql, filterParams),
      query<StatRow[]>(statsSql),
    ]);

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const stats: Record<string, { editores: number; obras: number }> = {};
    for (const e of ESTADOS) stats[e] = { editores: 0, obras: 0 };
    for (const r of statRows) {
      stats[r.estado] = { editores: Number(r.n), obras: Number(r.obras ?? 0) };
    }

    return NextResponse.json({
      success: true,
      data: editores,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    const message = error instanceof Error ? error.message : 'Error al conectar con la base de datos';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const editor = typeof body?.editor === 'string' ? body.editor.trim() : '';

    if (!editor) {
      return NextResponse.json(
        { success: false, error: 'Falta el campo editor' },
        { status: 400 }
      );
    }

    const sets: string[] = [];
    const params: unknown[] = [];

    if (body.estado !== undefined) {
      if (!(ESTADOS as readonly string[]).includes(body.estado)) {
        return NextResponse.json(
          { success: false, error: `Estado no valido: ${body.estado}` },
          { status: 400 }
        );
      }
      sets.push('estado = ?');
      params.push(body.estado);
    }

    // Los campos de texto/fecha se limpian a NULL cuando llegan vacios
    if (body.numero_catalogo !== undefined) {
      const v = String(body.numero_catalogo).trim();
      sets.push('numero_catalogo = ?');
      params.push(v === '' ? null : v);
    }

    if (body.fecha_peticion !== undefined) {
      const v = String(body.fecha_peticion).trim();
      if (v !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return NextResponse.json(
          { success: false, error: 'fecha_peticion debe tener formato YYYY-MM-DD' },
          { status: 400 }
        );
      }
      sets.push('fecha_peticion = ?');
      params.push(v === '' ? null : v);
    }

    if (body.tipo_catalogo !== undefined) {
      const v = String(body.tipo_catalogo).trim().toUpperCase();
      if (v !== '' && v !== 'GENERAL' && v !== 'ESPECIFICO') {
        return NextResponse.json(
          { success: false, error: `tipo_catalogo no valido: ${body.tipo_catalogo}` },
          { status: 400 }
        );
      }
      sets.push('tipo_catalogo = ?');
      params.push(v === '' ? null : v);
    }

    if (body.peer !== undefined) {
      const v = String(body.peer).trim().toUpperCase();
      if (v !== '' && v !== 'PEER' && v !== 'NO PEER') {
        return NextResponse.json(
          { success: false, error: `peer no valido: ${body.peer}` },
          { status: 400 }
        );
      }
      sets.push('peer = ?');
      params.push(v === '' ? null : v);
    }

    if (body.notas !== undefined) {
      const v = String(body.notas).trim();
      sets.push('notas = ?');
      params.push(v === '' ? null : v);
    }

    if (sets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos que actualizar' },
        { status: 400 }
      );
    }

    params.push(editor);
    await query(`UPDATE editores_sgae SET ${sets.join(', ')} WHERE editor = ?`, params);

    const rows = await query<EditorRow[]>(
      `SELECT editor, ipi, obras, estado, tipo_catalogo, peer, numero_catalogo,
              DATE_FORMAT(fecha_peticion, '%Y-%m-%d') AS fecha_peticion, notas
       FROM editores_sgae WHERE editor = ?`,
      [editor]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Editor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar el editor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const antes = await query<CountRow[]>('SELECT COUNT(*) AS total FROM editores_sgae');
    await query(REFRESH_SQL);
    const despues = await query<CountRow[]>('SELECT COUNT(*) AS total FROM editores_sgae');

    const previos = antes[0]?.total ?? 0;
    const totales = despues[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      total: totales,
      nuevos: totales - previos,
    });
  } catch (error) {
    console.error('Database error:', error);
    const message = error instanceof Error ? error.message : 'Error al refrescar la lista';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
