'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, Download, Loader2, Mail } from 'lucide-react';

type Tipo = 'GENERAL' | 'ESPECIFICO';

interface Props {
  editor: string;
  ipi: string | null;
  obras: number;
  tipoActual: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras un envío correcto, para refrescar la tabla. */
  onEnviado: () => void;
}

/** Descarga un fichero que llega en base64 desde la API. */
function descargar(nombre: string, base64: string, tipoMime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: tipoMime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function SolicitudCatalogoDialog({
  editor,
  ipi,
  obras,
  tipoActual,
  open,
  onOpenChange,
  onEnviado,
}: Props) {
  const [tipo, setTipo] = useState<Tipo>(
    tipoActual === 'GENERAL' ? 'GENERAL' : 'ESPECIFICO'
  );
  const [cargando, setCargando] = useState<'enviar' | 'generar' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const lanzar = async (enviar: boolean) => {
    setCargando(enviar ? 'enviar' : 'generar');
    setError(null);
    setExito(null);
    try {
      const res = await fetch('/api/editores/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editor, tipo, enviar }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const detalle = json.diagnostico ? ` [${json.diagnostico}]` : '';
        throw new Error((json.error || 'Error generando la solicitud') + detalle);
      }

      if (enviar) {
        const base =
          json.obras > 0
            ? `Enviado a ${json.destino} con ${json.obras} obras adjuntas.`
            : `Enviado a ${json.destino}. Un general no lleva listado de obras.`;
        const copia = json.copiaEnviados
          ? ` Copia guardada en "${json.copiaEnviados}".`
          : json.avisoCopia
            ? ` Ojo: no se pudo dejar copia en Enviados (${json.avisoCopia}).`
            : '';
        setExito(base + copia);
        onEnviado();
      } else {
        descargar(json.docx.nombre, json.docx.base64, MIME_DOCX);
        if (json.xlsx) {
          descargar(json.xlsx.nombre, json.xlsx.base64, MIME_XLSX);
          setExito(`Descargados la solicitud y ${json.obras} obras.`);
        } else {
          setExito('Descargada la solicitud. Un general no lleva listado.');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando la solicitud');
    } finally {
      setCargando(null);
    }
  };

  const sinIpi = !ipi;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar catálogo a SGAE</DialogTitle>
          <DialogDescription>
            Se genera la solicitud rellenada y el listado de obras del editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Editor</span>
              <span className="text-right font-medium">{editor}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">IPI</span>
              <span className="font-mono">{ipi ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Obras que se adjuntan</span>
              <span className="tabular-nums">
                {tipo === 'ESPECIFICO'
                  ? obras.toLocaleString('es-ES')
                  : 'ninguna, el general las cubre todas'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo-catalogo">Obras incluidas</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger id="tipo-catalogo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="ESPECIFICO">
                  Específico, permitiendo incorporar otras obras
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sinIpi && (
            <div className="text-destructive border-destructive/50 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Este editor no tiene IPI, así que SGAE rechazaría la solicitud.
            </div>
          )}

          {error && (
            <div className="text-destructive border-destructive/50 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {exito && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/50 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              {exito}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={sinIpi || cargando !== null}
            onClick={() => lanzar(false)}
          >
            {cargando === 'generar' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Solo descargar
          </Button>
          <Button
            disabled={sinIpi || cargando !== null}
            onClick={() => lanzar(true)}
          >
            {cargando === 'enviar' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Generar y enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
