import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as dns } from 'dns';
import { guardarEnEnviados } from '@/lib/guardar-enviado';
import { query } from '@/lib/db';
import {
  generarRepertorioXlsx,
  nombreRepertorio,
  type TipoCatalogo,
  type ObraRepertorio,
} from '@/lib/solicitud';
import { generarSolicitudPdf, nombreSolicitudPdf } from '@/lib/solicitud-pdf';

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
 * manda listado de obras y en su lugar se pide el traspaso automático de las
 * que ya estan registradas. El especifico si va acompanado de la lista.
 */
function cuerpoCorreo(tipo: TipoCatalogo, cuantos: number): string {
  const enLote = cuantos > 1;
  const lineas = ['Estimados Sres.', ''];

  if (tipo === 'GENERAL') {
    lineas.push(
      enLote
        ? `Enviamos la notificación de ${cuantos} contratos generales.`
        : 'Enviamos la notificación de un contrato general.',
      ''
    );
    lineas.push(
      enLote ? 'Rogamos números de catálogo.' : 'Rogamos número de catálogo.',
      ''
    );
    lineas.push(
      'Rogamos realicen cambio automático de todas las obras registradas ' +
        (enLote
          ? 'a favor de estos catálogos en SGAE.'
          : 'a favor de este catálogo en SGAE.'),
      ''
    );
  } else {
    lineas.push(
      enLote
        ? `Enviamos la notificación de ${cuantos} contratos específicos, así ` +
          'como las listas de obras controladas a través de ellos.'
        : 'Enviamos la notificación de un contrato específico, así como la ' +
          'lista de obras controladas a través de él.',
      ''
    );
    lineas.push(
      enLote ? 'Rogamos números de catálogo.' : 'Rogamos número de catálogo.',
      ''
    );
  }

  lineas.push('Un saludo', 'Hugo', '');
  return lineas.join('\n');
}

export async function POST(request: NextRequest) {
  // Se rellena segun avanza, para que el catch pueda contar donde fallo
  let comoResueltoInfo = 'sin llegar a resolver';
  let hostInfo = '';
  const diagnostico = () => `DNS: ${comoResueltoInfo}${hostInfo}`;

  try {
    const body = await request.json().catch(() => null);
    // Acepta un editor suelto o un lote
    const editores: string[] = Array.isArray(body?.editores)
      ? body.editores.map((e: unknown) => String(e ?? '').trim()).filter(Boolean)
      : [String(body?.editor ?? '').trim()].filter(Boolean);
    const tipo = String(body?.tipo ?? '').toUpperCase() as TipoCatalogo;
    // Sin enviar solo se genera y se descarga, util para revisar antes de mandar
    const enviar = body?.enviar !== false;

    if (editores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Falta el editor' },
        { status: 400 }
      );
    }
    // Cada editor especifico arrastra su Excel de obras, y el servidor de
    // correo corta en 50 MB, asi que conviene no hacer lotes enormes.
    if (editores.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: `Son ${editores.length} editores; el máximo por solicitud es 30`,
        },
        { status: 400 }
      );
    }
    if (tipo !== 'GENERAL' && tipo !== 'ESPECIFICO') {
      return NextResponse.json(
        { success: false, error: 'El tipo debe ser GENERAL o ESPECIFICO' },
        { status: 400 }
      );
    }

    const marcas = editores.map(() => '?').join(',');
    const filas = await query<EditorRow[]>(
      `SELECT editor, ipi, obras, tipo_catalogo FROM editores_sgae
       WHERE editor IN (${marcas})`,
      editores
    );
    const faltan = editores.filter((e) => !filas.some((f) => f.editor === e));
    if (faltan.length) {
      return NextResponse.json(
        { success: false, error: `Editor no encontrado: ${faltan.join(', ')}` },
        { status: 404 }
      );
    }
    const sinIpi = filas.filter((f) => !f.ipi).map((f) => f.editor);
    if (sinIpi.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Sin IPI, SGAE los rechazaría: ${sinIpi.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const hoy = new Date();
    // El listado de obras solo acompana a los catalogos especificos
    const conListado = tipo === 'ESPECIFICO';

    const pdf = await generarSolicitudPdf({
      editores: filas.map((f) => ({ editor: f.editor, ipi: f.ipi as string })),
      tipo,
      fecha: hoy,
    });

    // Un Excel de obras por editor, solo en los especificos
    const listados: { nombre: string; buffer: Buffer; obras: number }[] = [];
    let numObras = 0;
    if (conListado) {
      for (const f of filas) {
        const obras = await query<ObraRow[]>(REPERTORIO_SQL, [
          f.editor,
          f.editor,
        ]);
        const repertorio: ObraRepertorio[] = obras.map((o) => ({
          Title: String(o.titulo ?? ''),
          'Composers/Authors': String(o.total_autores ?? ''),
        }));
        numObras += repertorio.length;
        listados.push({
          nombre: nombreRepertorio(f.editor),
          buffer: generarRepertorioXlsx(repertorio),
          obras: repertorio.length,
        });
      }
    }

    const nombrePdf = nombreSolicitudPdf();

    if (!enviar) {
      return NextResponse.json({
        success: true,
        enviado: false,
        tipo,
        editores: filas.map((f) => f.editor),
        obras: numObras,
        pdf: { nombre: nombrePdf, base64: pdf.toString('base64') },
        listados: listados.map((l) => ({
          nombre: l.nombre,
          base64: l.buffer.toString('base64'),
        })),
      });
    }

    // Las variables se recortan: pegarlas en el panel suele dejar espacios o
    // un salto de linea al final, y eso hace que el DNS de EBADNAME.
    const limpiar = (v?: string) => (v ?? '').replace(/\s+/g, '');
    const SMTP_HOST = limpiar(process.env.SMTP_HOST);
    const SMTP_PORT = limpiar(process.env.SMTP_PORT);
    const SMTP_USER = limpiar(process.env.SMTP_USER);
    const SMTP_PASS = process.env.SMTP_PASS ?? '';
    const MAIL_TO = limpiar(process.env.MAIL_TO);
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
    // se conecta por IP. SMTP_IP permite fijarla si el DNS del sandbox tampoco
    // responde; el servername mantiene la validacion del certificado.
    let destinoSmtp = SMTP_HOST;
    let servername: string | undefined;
    let comoResuelto = 'nombre (sin resolver)';
    const crudo = process.env.SMTP_HOST ?? '';
    if (crudo !== SMTP_HOST) {
      hostInfo = ` | SMTP_HOST traia caracteres raros: ${JSON.stringify(crudo)}`;
    }

    if (process.env.SMTP_IP) {
      destinoSmtp = process.env.SMTP_IP;
      servername = SMTP_HOST;
      comoResuelto = `SMTP_IP=${destinoSmtp}`;
      comoResueltoInfo = comoResuelto;
    } else {
      try {
        const [ip] = await dns.resolve4(SMTP_HOST);
        if (ip) {
          destinoSmtp = ip;
          servername = SMTP_HOST;
          comoResuelto = `resolve4=${ip}`;
          comoResueltoInfo = comoResuelto;
        }
      } catch (e) {
        comoResuelto =
          'resolve4 fallo: ' + (e instanceof Error ? e.message : String(e));
        comoResueltoInfo = comoResuelto;
      }
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

    // La solicitud va a SGAE con copia a Yolanda e Iris. MAIL_TO y MAIL_CC
    // permiten desviarlas para probar sin escribir a la sociedad.
    const destino = MAIL_TO || 'contratos.internacional@sgae.es';
    const copia = (
      limpiar(process.env.MAIL_CC) ||
      'yolanda@proyectosdeautor.com,iris@proyectosdeautor.com'
    )
      .split(',')
      .filter(Boolean);
    const adjuntos = [
      { filename: nombrePdf, content: pdf },
      ...listados.map((l) => ({ filename: l.nombre, content: l.buffer })),
    ];

    const mensaje = {
      from: SMTP_USER,
      to: destino,
      ...(copia.length ? { cc: copia } : {}),
      subject: 'CATÁLOGOS CONCORD',
      text: cuerpoCorreo(tipo, filas.length),
      attachments: adjuntos,
    };

    const info = await transporte.sendMail(mensaje);

    // SMTP no deja copia en Enviados, hay que archivarla por IMAP aparte.
    // Se reconstruye el mismo mensaje para subir exactamente lo enviado.
    let copiaEnviados: string | null = null;
    let avisoCopia: string | null = null;
    try {
      const constructor = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
        newline: 'unix',
      });
      const generado = await constructor.sendMail({
        ...mensaje,
        messageId: info.messageId,
      });
      const resultado = await guardarEnEnviados({
        host: limpiar(process.env.IMAP_HOST) || SMTP_HOST,
        port: parseInt(limpiar(process.env.IMAP_PORT) || '993', 10),
        user: SMTP_USER,
        pass: SMTP_PASS,
        raw: generado.message as Buffer,
      });
      if ('carpeta' in resultado) {
        copiaEnviados = resultado.carpeta;
      } else {
        avisoCopia = resultado.error;
      }
    } catch (e) {
      avisoCopia = e instanceof Error ? e.message : String(e);
    }

    // Quedan registrados como pedidos, con la fecha del envio
    const fechaSql = hoy.toISOString().slice(0, 10);
    await query(
      `UPDATE editores_sgae
       SET estado = 'Pedido sin numero', tipo_catalogo = ?, fecha_peticion = ?
       WHERE editor IN (${marcas})`,
      [tipo, fechaSql, ...editores]
    );

    return NextResponse.json({
      success: true,
      enviado: true,
      destino,
      copia,
      tipo,
      editores: filas.map((f) => f.editor),
      obras: numObras,
      adjuntos: adjuntos.map((a) => a.filename),
      copiaEnviados,
      avisoCopia,
    });
  } catch (error) {
    console.error('Error generando la solicitud:', error);
    const message =
      error instanceof Error ? error.message : 'Error generando la solicitud';
    return NextResponse.json(
      { success: false, error: message, diagnostico: diagnostico() },
      { status: 500 }
    );
  }
}
