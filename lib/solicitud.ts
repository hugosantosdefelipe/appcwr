import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

/** Cómo se pide el catálogo a SGAE. */
export type TipoCatalogo = 'GENERAL' | 'ESPECIFICO';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "24 de septiembre de 2026", tal y como aparece en la plantilla. */
export function fechaEnLetra(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Escapa los caracteres que XML no admite en un nodo de texto.
 * Los nombres de editor traen ampersands y comillas con frecuencia.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Rellena la plantilla de solicitud de catálogo.
 *
 * La plantilla lleva marcadores {{...}} preparados de antemano, cada uno
 * dentro de un único nodo <w:t>, de modo que basta con sustituir texto en
 * word/document.xml. Así no hay que reconstruir el documento y se conservan
 * el membrete, el logo y la firma, que van incrustados como VML.
 */
export async function generarSolicitudDocx(opts: {
  editor: string;
  ipi: string;
  tipo: TipoCatalogo;
  fecha?: Date;
}): Promise<Buffer> {
  const plantilla = path.join(
    process.cwd(),
    'templates',
    'solicitud-catalogo-concord.docx'
  );
  const zip = await JSZip.loadAsync(await readFile(plantilla));

  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('La plantilla no contiene word/document.xml');
  }

  const sustituciones: Record<string, string> = {
    '{{EDITOR}}': escapeXml(opts.editor),
    '{{IPI}}': escapeXml(opts.ipi || ''),
    '{{FECHA}}': escapeXml(fechaEnLetra(opts.fecha ?? new Date())),
    '{{X_GENERAL}}': opts.tipo === 'GENERAL' ? 'X' : '',
    '{{X_ESPECIFICO}}': opts.tipo === 'ESPECIFICO' ? 'X' : '',
  };

  let xml = await docXml.async('string');
  for (const [marcador, valor] of Object.entries(sustituciones)) {
    xml = xml.split(marcador).join(valor);
  }
  zip.file('word/document.xml', xml);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** Una obra del repertorio, con las columnas que espera SGAE. */
export interface ObraRepertorio {
  Title: string;
  'Composers/Authors': string;
}

/** Construye el Excel de obras con las mismas columnas que "Exportar repertorio". */
export function generarRepertorioXlsx(obras: ObraRepertorio[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(obras, {
    header: ['Title', 'Composers/Authors'],
  });
  ws['!cols'] = [{ wch: 55 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Repertory');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Nombre de fichero sin caracteres que den problemas al adjuntar. */
export function nombreFichero(editor: string, ext: string): string {
  const limpio = editor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ._-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
  return `${limpio || 'editor'}.${ext}`;
}
