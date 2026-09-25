import { readFile } from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fechaEnLetra, type TipoCatalogo } from '@/lib/solicitud';

/**
 * Posiciones tomadas del propio formulario de SGAE, en puntos PDF y medidas
 * desde arriba, que es como las da el documento original.
 */
const ALTO_PAGINA = 841.92;
const TAM = 10;

interface Linea {
  x: number;
  /** Distancia desde el borde superior, como en el documento original. */
  yDesdeArriba: number;
  texto: string;
}

/**
 * Genera la solicitud de catálogo en PDF.
 *
 * Se parte del formulario original con sus datos variables ya vaciados, de
 * modo que aquí solo hay que escribir encima: así se conservan el membrete,
 * el logo, la firma y el resto del texto exactamente como los emite SGAE.
 */
export async function generarSolicitudPdf(opts: {
  editor: string;
  ipi: string;
  tipo: TipoCatalogo;
  fecha?: Date;
}): Promise<Buffer> {
  const plantilla = path.join(
    process.cwd(),
    'templates',
    'solicitud-catalogo-concord.pdf'
  );
  const pdf = await PDFDocument.load(await readFile(plantilla));
  const pagina = pdf.getPages()[0];
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);

  const marca = (t: TipoCatalogo) => (opts.tipo === t ? '  X' : '');

  const lineas: Linea[] = [
    // Las cuatro casillas de OBRAS INCLUÍDAS
    { x: 120.5, yDesdeArriba: 302, texto: 'General:' + marca('GENERAL') },
    { x: 120.5, yDesdeArriba: 313.7, texto: 'General con excepciones:' },
    { x: 121.1, yDesdeArriba: 325.3, texto: 'Sólo las relacionadas:' },
    {
      x: 121.1,
      yDesdeArriba: 337,
      texto:
        'Específico pero permitiendo la incorporación de otras obras:' +
        marca('ESPECIFICO'),
    },
    // El editor cedente, a continuación de su etiqueta
    {
      x: 171.3,
      yDesdeArriba: 360,
      texto: `${opts.editor} - IPI ${opts.ipi}`,
    },
    {
      x: 85.1,
      yDesdeArriba: 653,
      texto: `En León a ${fechaEnLetra(opts.fecha ?? new Date())}`,
    },
  ];

  for (const l of lineas) {
    pagina.drawText(l.texto, {
      x: l.x,
      y: ALTO_PAGINA - l.yDesdeArriba,
      size: TAM,
      font: fuente,
      color: rgb(0, 0, 0),
    });
  }

  return Buffer.from(await pdf.save());
}

/** La solicitud va siempre con el mismo nombre. */
export function nombreSolicitudPdf(): string {
  return 'CONTRATO SUBEDICIÓN CONCORD.pdf';
}
