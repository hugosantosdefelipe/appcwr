import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as dns } from 'dns';
import { query } from '@/lib/db';
import {
  generarSolicitudDocx,
  generarRepertorioXlsx,
  nombreSolicitud,
  nombreRepertorio,
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

/**
 * Cuerpo del correo.
 *
 * Un catalogo general cubre todo el repertorio del editor, asi que no se
 * manda listado de obras y en su lugar se pide el traspaso automatico de las
 * que ya estan registradas. El especifico si va acompanado de la lista.
 */
function cuerpoCorreo(tipo: TipoCatalogo): string {
  const lineas = ['Estimados Sres.', ''];

  if (tipo === 'GENERAL') {
    lineas.push('Enviamos la notificación de un contrato general.', '');
    lineas.push('Rogamos número de catálogo.', '');
    lineas.push(
      'Rogamos realicen cambio automático de todas las obras registradas ' +
        'a favor de este catálogo en SGAE.',
      ''
    );
  } else {
    lineas.push(
      'Enviamos la notificación de un contrato específico, así como la lista ' +
        'de obras controladas a través de él.',
      ''
    );
    lineas.push('Rogamos número de catálogo.', '');
  }

  lineas.push('Un saludo', 'Hugo', '');
  return lineas.join('\n');
}

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
    // El listado de obras solo acompana a los catalogos especificos
    const conListado = tipo === 'ESPECIFICO';

    const docx = await generarSolicitudDocx({
      editor,
      ipi: fila.ipi,
      tipo,
      fecha: hoy,
    });

    let xlsx: Buffer | null = null;
    let numObras = 0;
    if (conListado) {
      const obras = await query<ObraRow[]>(REPERTORIO_SQL, [editor, editor]);
      const repertorio: ObraRepertorio[] = obras.map((o) => ({
        Title: String(o.titulo ?? ''),
        'Composers/Authors': String(o.total_autores ?? ''),
      }));
      numObras = repertorio.length;
      xlsx = generarRepertorioXlsx(repertorio);
    }

    const nombreDocx = nombreSolicitud();
    const nombreXlsx = nombreRepertorio(editor);

    if (!enviar) {
      return NextResponse.json({
        success: true,
        enviado: false,
        tipo,
        obras: numObras,
        docx: { nombre: nombreDocx, base64: docx.toString('base64') },
        xlsx: xlsx
          ? { nombre: nombreXlsx, base64: xlsx.toString('base64') }
          : null,
      });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Faltan SMTP_HOST, SMTP_USER o SMTP_PASS. Si acabas de añadirlas ' +
            'en Vercel, hay que redesplegar para que se apliquen.',
        },
        { status: 500 }
      );
    }

    const puerto = parseInt(SMTP_PORT || '587', 10);

    // En Vercel la resolucion por getaddrinfo falla a ratos con EBUSY, asi que
    // se resuelve con resolve4 (c-ares, sin threadpool) y se conecta por IP.
    // El servername mantiene la validacion del certificado contra el dominio.
    let destinoSmtp = SMTP_HOST;
    let servername: string | undefined;
    try {
      const [ip] = await dns.resolve4(SMTP_HOST);
      if (ip) {
        destinoSmtp = ip;
        servername = SMTP_HOST;
      }
    } catch {
      // Si tampoco resuelve, se intenta con el nombre tal cual
    }

    const transporte = nodemailer.createTransport({
      host: destinoSmtp,
      port: puerto,
      secure: puerto === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      ...(servername ? { tls: { servername } } : {}),
      connectionTimeout: 20000,
      greetingTimeout: 20000,
    });

    const destino = MAIL_TO || SMTP_USER;
    const adjuntos = [{ filename: nombreDocx, content: docx }];
    if (xlsx) {
      adjuntos.push({ filename: nombreXlsx, content: xlsx });
    }

    await transporte.sendMail({
      from: SMTP_USER,
      to: destino,
      subject: 'CATÁLOGOS CONCORD',
      text: cuerpoCorreo(tipo),
      attachments: adjuntos,
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
      tipo,
      obras: numObras,
      adjuntos: adjuntos.map((a) => a.filename),
    });
  } catch (error) {
    console.error('Error generando la solicitud:', error);
    const message =
      error instanceof Error ? error.message : 'Error generando la solicitud';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
