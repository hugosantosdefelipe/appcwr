import { ImapFlow } from 'imapflow';

/**
 * Deja una copia del correo en la carpeta de Enviados por IMAP.
 *
 * SMTP solo entrega el mensaje: la copia en Enviados la hace el cliente de
 * correo por su cuenta, asi que hay que replicarla aqui o los envios de la
 * aplicacion no aparecen en Outlook.
 *
 * Devuelve el nombre de la carpeta usada, o null si no se pudo guardar. No
 * lanza: el correo ya salio, y no poder archivarlo no debe dar el envio por
 * fallido.
 */
export async function guardarEnEnviados(opts: {
  host: string;
  user: string;
  pass: string;
  port?: number;
  raw: Buffer;
}): Promise<{ carpeta: string } | { error: string }> {
  const cliente = new ImapFlow({
    host: opts.host,
    port: opts.port ?? 993,
    secure: true,
    auth: { user: opts.user, pass: opts.pass },
    logger: false,
    // Sin esto una caida del servidor dejaria la peticion colgada
    socketTimeout: 20000,
    greetingTimeout: 15000,
  });

  try {
    await cliente.connect();

    // El nombre de la carpeta cambia segun el idioma del servidor (Sent,
    // Enviados, INBOX.Sent...), asi que se busca por su marca \Sent, que es
    // la unica forma fiable. Si no la declara, se prueban los nombres tipicos.
    let destino: string | null = null;
    for (const buzon of await cliente.list()) {
      if (buzon.specialUse === '\\Sent') {
        destino = buzon.path;
        break;
      }
    }
    if (!destino) {
      const candidatos = ['Sent', 'Enviados', 'INBOX.Sent', 'INBOX.Enviados'];
      const existentes = new Set((await cliente.list()).map((b) => b.path));
      destino = candidatos.find((c) => existentes.has(c)) ?? null;
    }
    if (!destino) {
      return { error: 'no se encontró la carpeta de Enviados' };
    }

    // \Seen para que no aparezca como no leido en la propia bandeja
    await cliente.append(destino, opts.raw, ['\\Seen'], new Date());
    return { carpeta: destino };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    try {
      await cliente.logout();
    } catch {
      // Da igual como se cierre, el mensaje ya esta archivado
    }
  }
}
