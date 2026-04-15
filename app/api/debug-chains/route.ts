import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ChainRow {
  copyright_chains: unknown;
}

export async function GET() {
  try {
    const result = await query<ChainRow[]>(
      'SELECT copyright_chains FROM cwr_obras WHERE copyright_chains IS NOT NULL LIMIT 1'
    );

    if (result.length === 0) {
      return NextResponse.json({ message: 'No hay datos con copyright_chains' });
    }

    const raw = result[0].copyright_chains;

    return NextResponse.json({
      raw_value: raw,
      type: typeof raw,
      is_null: raw === null,
      is_string: typeof raw === 'string',
      string_length: typeof raw === 'string' ? raw.length : null,
      first_100_chars: typeof raw === 'string' ? raw.substring(0, 100) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
