import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ObraRow {
  concord_code?: unknown;
  titulo?: unknown;
  total_autores?: unknown;
  [key: string]: unknown;
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function findColumn(candidates: string[]): Promise<string | null> {
  const cols = await query<Array<{ Field: string }>>('SHOW COLUMNS FROM cwr_obras');
  const targets = new Set(candidates.map((c) => normalizeKey(c)));
  for (const c of cols) {
    if (targets.has(normalizeKey(c.Field))) return c.Field;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search')?.trim() || '';

    const tableColumns = await query<Array<{ Field: string }>>(
      'SHOW COLUMNS FROM cwr_obras'
    );
    const validColumns = new Set(tableColumns.map((c) => c.Field));

    const concordCol =
      (await findColumn(['concord_code', 'concordcode', 'concord code'])) ||
      'concord_code';
    const tituloCol = (await findColumn(['titulo', 'title'])) || 'titulo';
    const autoresCol =
      (await findColumn(['total_autores', 'totalautores', 'total autores'])) ||
      'total_autores';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      const tOk = validColumns.has(tituloCol);
      if (tOk) {
        conditions.push(`(\`${concordCol}\` LIKE ? OR \`${tituloCol}\` LIKE ?)`);
        const pat = `%${search}%`;
        params.push(pat, pat);
      } else {
        conditions.push(`\`${concordCol}\` LIKE ?`);
        params.push(`%${search}%`);
      }
    }

    for (const [key, value] of searchParams.entries()) {
      const match = key.match(/^filter\[(.+)\]$/);
      if (match && value.trim()) {
        const column = match[1];
        if (validColumns.has(column)) {
          conditions.push(`\`${column}\` LIKE ?`);
          params.push(`%${value.trim()}%`);
        }
      }
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT \`${concordCol}\` AS concord_code, \`${tituloCol}\` AS titulo, \`${autoresCol}\` AS total_autores FROM cwr_obras ${whereSql}`;

    const rows = await query<ObraRow[]>(sql, params);

    return NextResponse.json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    console.error('all-filtered error:', error);
    const message = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
