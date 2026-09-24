import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { query } from '@/lib/db';
import {
  generarSolicitudDocx,
  generarRepertorioXlsx,
  nombreFichero,
  fechaEnLetra,
  type TipoCatalogo,
  type ObraRepertorio,
} from '@/lib/solicitud';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface EditorRow {
  editor: string;
  ipi: string | null;
  obras: number;
  tipo_catalogo: string | null;
}

interface ObraRow {
  titulo: string | null;
  total_autores: string | null;
}

/**
 * Obras en las que el editor controla derechos, es decir, aparece en alguna
 * cadena distinta de la Z. Misma condicion que usa "Exportar repertorio".
 */
const REPERTORIO_SQL = `
  SELECT DISTINCT o.titulo, o.total_autores
  FROM cwr_obras o
  WHERE EXISTS (
    SELECT 1 FROM JSON_TABLE(
      o.copyright_chains, '$[*]' COLUMNS (
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const editor = String(body?.editor ?? '').trim();
    const tipo = String(body?.tipo ?? '').toUpperCase() as TipoCatalogo;
    // Sin enviar solo se genera y se descarga, util para revisar antes de mandar
    const enviar = body?.enviar !== false;

    if (!editor) {
      return NextResponse.json(
        { success: false, error: 'Falta el editor' },
        { status: 400 }
      );
    }
    if (tipo !== 'GENERAL' && tipo !== 'ESPECIFICO') {
      return NextResponse.json(
        { success: false, error: 'El tipo debe ser GENERAL o ESPECIFICO' },
        { status: 400 }
      );
    }

    const filas = await query<EditorRow[]>(
      'SELECT editor, ipi, obras, tipo_catalogo FROM editores_sgae WHERE editor = ?',
      [editor]
    );
    if (filas.length === 0) {
      return NextResponse.json(
        { success: false, error: `Editor no encontrado: ${editor}` },
        { status: 404 }
      );
    }
    const fila = filas[0];
    if (!fila.ipi) {
      return NextResponse.json(
        { success: false, error: `${editor} no tiene IPI, SGAE lo va a rechazar` },
        { status: 400 }
      );
    }

    const hoy = new Date();

    const obras = await query<ObraRow[]>(REPERTORIO_SQL, [editor, editor]);
    const repertorio: ObraRepertorio[] = obras.map((o) => ({
      Title: String(o.titulo ?? ''),
      'Composers/Authors': String(o.total_autores ?? ''),
    }));

    const [docx, xlsx] = await Promise.all([
      generarSolicitudDocx({ editor, ipi: fila.ipi, tipo, fecha: hoy }),
      Promise.resolve(generarRepertorioXlsx(repertorio)),
    ]);

    const nombreDocx = nombreFichero(`Solicitud ${editor}`, 'docx');
    const nombreXlsx = nombreFichero(`Repertorio ${editor}`, 'xlsx');

    if (!enviar) {
      return NextResponse.json({
        success: true,
        enviado: false,
        obras: repertorio.length,
        docx: { nombre: nombreDocx, base64: docx.toString('base64') },
        xlsx: { nombre: nombreXlsx, base64: xlsx.toString('base64') },
      });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Faltan las variables SMTP_HOST, SMTP_USER o SMTP_PASS en el entorno',
        },
        { status: 500 }
      );
    }

    const puerto = parseInt(SMTP_PORT || '587', 10);
    const transporte = nodemailer.createTransport({
      host: SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const etiquetaTipo = tipo === 'GENERAL' ? 'General' : 'Específico';
    const destino = MAIL_TO || SMTP_USER;

    await transporte.sendMail({
      from: SMTP_USER,
      to: destino,
      subject: `Solicitud de registro de catálogo ${etiquetaTipo} — ${editor}`,
      text:
        `Solicitud de registro de catálogo para ${editor} (IPI ${fila.ipi}).\n\n` +
        `Tipo: ${etiquetaTipo}\n` +
        `Obras del editor: ${repertorio.length}\n` +
        `Fecha: ${fechaEnLetra(hoy)}\n\n` +
        `Se adjuntan la solicitud y el listado de obras.\n`,
      attachments: [
        { filename: nombreDocx, content: docx },
        { filename: nombreXlsx, content: xlsx },
      ],
    });

    // Queda registrado como pedido, con la fecha del envio
    const fechaSql = hoy.toISOString().slice(0, 10);
    await query(
      `UPDATE editores_sgae
       SET estado = 'Pedido sin numero', tipo_catalogo = ?, fecha_peticion = ?
       WHERE editor = ?`,
      [tipo, fechaSql, editor]
    );

    return NextResponse.json({
      success: true,
      enviado: true,
      destino,
      obras: repertorio.length,
      adjuntos: [nombreDocx, nombreXlsx],
    });
  } catch (error) {
    console.error('Error generando la solicitud:', error);
    const message =
      error instanceof Error ? error.message : 'Error generando la solicitud';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
