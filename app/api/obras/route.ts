import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ObraRow {
  [key: string]: unknown;
}

interface CountRow {
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const sortBy = searchParams.get('sortBy') || 'concord_code';
    const sortOrder = searchParams.get('sortOrder')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    // Sanitizar nombre de columna para ORDER BY (prevenir SQL injection)
    const allowedSortColumns = ['concord_code', 'created_at', 'updated_at', 'title'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'concord_code';

    // Obtener columnas de la tabla para validar filtros
    const tableColumns = await query<Array<{ Field: string }>>(
      'SHOW COLUMNS FROM cwr_obras'
    );
    const validColumns = new Set(tableColumns.map(c => c.Field));

    const conditions: string[] = [];
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (search) {
      conditions.push('(concord_code LIKE ? OR title LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

    // Filtros por columna: filter[column_name]=value
    for (const [key, value] of searchParams.entries()) {
      const match = key.match(/^filter\[(.+)\]$/);
      if (match && value.trim()) {
        const column = match[1];
        if (validColumns.has(column)) {
          conditions.push(`\`${column}\` LIKE ?`);
          const filterPattern = `%${value.trim()}%`;
          params.push(filterPattern);
          countParams.push(filterPattern);
        }
      }
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataSql = `SELECT * FROM cwr_obras ${whereSql} ORDER BY ${safeSortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const countSql = `SELECT COUNT(*) as total FROM cwr_obras ${whereSql}`;

    const [obras, countResult] = await Promise.all([
      query<ObraRow[]>(dataSql, params),
      query<CountRow[]>(countSql, countParams),
    ]);

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: obras,
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

    const message = error instanceof Error
      ? error.message
      : 'Error al conectar con la base de datos';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
