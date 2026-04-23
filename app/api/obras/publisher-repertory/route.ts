import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Distinct publisher names that appear in a non-Z chain (both `publisher`
// singular and entries of `publishers` plural are collected).
const NON_Z_PUBLISHERS_SUBQUERY = `
  SELECT pub_name FROM (
    SELECT c.single_pub_name AS pub_name
    FROM cwr_obras o, JSON_TABLE(
      o.copyright_chains, '$[*]' COLUMNS (
        chain_id VARCHAR(10) PATH '$.id',
        single_pub_name VARCHAR(1000) PATH '$.publisher.name'
      )
    ) c
    WHERE COALESCE(c.chain_id, '') <> 'Z' AND c.single_pub_name IS NOT NULL
    UNION
    SELECT p.name AS pub_name
    FROM cwr_obras o,
    JSON_TABLE(
      o.copyright_chains, '$[*]' COLUMNS (
        chain_id VARCHAR(10) PATH '$.id',
        pubs_json JSON PATH '$.publishers'
      )
    ) c,
    JSON_TABLE(c.pubs_json, '$[*]' COLUMNS (name VARCHAR(1000) PATH '$.name')) p
    WHERE COALESCE(c.chain_id, '') <> 'Z' AND p.name IS NOT NULL
  ) t
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? '').trim();
    const exact = Boolean(body?.exact);
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Publisher name required' },
        { status: 400 }
      );
    }

    // Try exact (case-insensitive) match first
    const exactRows = await query<Array<{ pub_name: string }>>(
      `SELECT DISTINCT pub_name FROM (${NON_Z_PUBLISHERS_SUBQUERY}) x WHERE LOWER(pub_name) = LOWER(?) LIMIT 1`,
      [name]
    );
    const hasExact = exactRows.length > 0;
    const chosenName = exact
      ? name
      : hasExact
        ? exactRows[0].pub_name
        : null;

    if (!chosenName) {
      // Return candidates (fuzzy)
      const candRows = await query<Array<{ pub_name: string }>>(
        `SELECT DISTINCT pub_name FROM (${NON_Z_PUBLISHERS_SUBQUERY}) x WHERE LOWER(pub_name) LIKE LOWER(?) ORDER BY pub_name LIMIT 100`,
        [`%${name}%`]
      );
      return NextResponse.json({
        success: true,
        exported: false,
        candidates: candRows.map((r) => r.pub_name),
      });
    }

    // Export rows: obras that have this publisher in at least one non-Z chain
    const exportSql = `
      SELECT DISTINCT
        o.titulo AS titulo,
        o.total_autores AS total_autores,
        o.concord_code AS concord_code
      FROM cwr_obras o
      WHERE EXISTS (
        SELECT 1 FROM JSON_TABLE(
          o.copyright_chains,
          '$[*]' COLUMNS (
            chain_id VARCHAR(10) PATH '$.id',
            single_pub_name VARCHAR(1000) PATH '$.publisher.name',
            pubs_json JSON PATH '$.publishers'
          )
        ) c
        WHERE COALESCE(c.chain_id, '') <> 'Z'
          AND (
            LOWER(c.single_pub_name) = LOWER(?)
            OR (
              c.pubs_json IS NOT NULL AND EXISTS (
                SELECT 1 FROM JSON_TABLE(
                  c.pubs_json, '$[*]' COLUMNS (name VARCHAR(1000) PATH '$.name')
                ) p
                WHERE LOWER(p.name) = LOWER(?)
              )
            )
          )
      )
      ORDER BY o.titulo
    `;
    const rows = await query<
      Array<{ titulo: unknown; total_autores: unknown; concord_code: unknown }>
    >(exportSql, [chosenName, chosenName]);

    return NextResponse.json({
      success: true,
      exported: true,
      publisher: chosenName,
      rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('publisher-repertory error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
