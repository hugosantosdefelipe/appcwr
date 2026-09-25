import { readFile } from 'fs/promises';
import path from 'path';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { fechaEnLetra, type TipoCatalogo } from '@/lib/solicitud';

/** Un editor dentro de la solicitud. */
export interface EditorSolicitud {
  editor: string;
  ipi: string;
}

const ALTO_PAGINA = 841.92;
const TAM = 10;
/** El listado de la segunda hoja va algo mayor, como en el original. */
const TAM_LISTADO = 11;

/**
 * Posiciones tomadas del formulario de SGAE, medidas desde el borde superior.
 *
 * En la versión de lote la línea "y todos los demás indicados en el listado
 * adjunto" empuja hacia abajo todo lo que va debajo, así que la fecha cae 13,5
 * puntos más abajo y cada modo tiene su propia plantilla.
 */
const POS = {
  casillas: [
    { x: 120.5, y: 302, texto: 'General:' },
    { x: 120.5, y: 313.7, texto: 'General con excepciones:' },
    { x: 121.1, y: 325.3, texto: 'Sólo las relacionadas:' },
    {
      x: 121.1,
      y: 337,
      texto: 'Específico pero permitiendo la incorporación de otras obras:',
    },
  ],
  editor: { x: 171.3, y: 360 },
  fechaIndividual: { x: 85.1, y: 653 },
  fechaLote: { x: 85.1, y: 666.8 },
  // Listado de la segunda hoja
  listado: { xIpi: 85.1, xNombre: 155.9, yPrimera: 106.2, salto: 13.45 },
};

function escribir(
  pagina: PDFPage,
  fuente: PDFFont,
  x: number,
  yDesdeArriba: number,
  texto: string,
  tam = TAM
) {
  pagina.drawText(texto, {
    x,
    y: ALTO_PAGINA - yDesdeArriba,
    size: tam,
    font: fuente,
    color: rgb(0, 0, 0),
  });
}

/**
 * Genera la solicitud de catálogo en PDF.
 *
 * Con un solo editor se usa el formulario simple. Con varios se usa el de
 * lote, que nombra al primero en la cabecera, remite al listado adjunto y
 * lleva a todos en una segunda hoja con su IPI, tal y como se venían
 * enviando a mano.
 *
 * Se parte del formulario original con los datos variables ya vaciados, de
 * modo que aquí solo hay que escribir encima: así se conservan el membrete,
 * el logo, la firma y el resto del texto exactamente como los emite SGAE.
 */
export async function generarSolicitudPdf(opts: {
  editores: EditorSolicitud[];
  tipo: TipoCatalogo;
  fecha?: Date;
}): Promise<Buffer> {
  if (opts.editores.length === 0) {
    throw new Error('Hace falta al menos un editor');
  }
  const enLote = opts.editores.length > 1;

  const plantilla = path.join(
    process.cwd(),
    'templates',
    enLote
      ? 'solicitud-catalogo-concord-lote.pdf'
      : 'solicitud-catalogo-concord.pdf'
  );
  const pdf = await PDFDocument.load(await readFile(plantilla));
  const paginas = pdf.getPages();
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const p1 = paginas[0];

  // Las cuatro casillas, con la X en la que corresponda
  for (const c of POS.casillas) {
    const esEsta =
      (c.texto.startsWith('General:') && opts.tipo === 'GENERAL') ||
      (c.texto.startsWith('Específico') && opts.tipo === 'ESPECIFICO');
    escribir(p1, fuente, c.x, c.y, c.texto + (esEsta ? '  X' : ''));
  }

  // En un lote, el primero encabeza y el resto va en el listado
  const cabecera = opts.editores[0];
  escribir(
    p1,
    fuente,
    POS.editor.x,
    POS.editor.y,
    `${cabecera.editor} - IPI ${cabecera.ipi}`
  );

  const fecha = `En León a ${fechaEnLetra(opts.fecha ?? new Date())}`;
  const posFecha = enLote ? POS.fechaLote : POS.fechaIndividual;
  escribir(p1, fuente, posFecha.x, posFecha.y, fecha);

  if (enLote) {
    // Segunda hoja: IPI y nombre, ordenados por nombre como en el original
    const p2 = paginas[1];
    const ordenados = [...opts.editores].sort((a, b) =>
      a.editor.localeCompare(b.editor, 'es')
    );
    ordenados.forEach((e, i) => {
      const y = POS.listado.yPrimera + i * POS.listado.salto;
      escribir(p2, fuente, POS.listado.xIpi, y, e.ipi, TAM_LISTADO);
      escribir(p2, fuente, POS.listado.xNombre, y, e.editor, TAM_LISTADO);
    });
  }

  return Buffer.from(await pdf.save());
}

/** La solicitud va siempre con el mismo nombre. */
export function nombreSolicitudPdf(): string {
  return 'CONTRATO SUBEDICIÓN CONCORD.pdf';
}
