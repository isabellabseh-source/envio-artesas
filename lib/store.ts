import 'server-only';
import { randomUUID } from 'crypto';
import { buscar } from './db';
import { caminhoSeguro, lerArquivo, salvarArquivo } from './arquivos';
import { buscarEnvioPorToken } from './negocio';
import { Cliente, Envio } from './modelo';
import { Artesa, Status } from './types';

/**
 * The artisan-facing side of the system: what her link opens and the files she sends.
 * `Artesa` is the shape the form, the content page and the PDF were built on; it is now assembled
 * from the order's content (Envio) and the client record.
 */

export function comoArtesa(e: Envio, c: Pick<Cliente, 'nome' | 'atelie' | 'whatsapp'> | null): Artesa {
  return {
    id: e.id,
    nome: c?.nome ?? '',
    atelie: c?.atelie ?? '',
    whatsapp: c?.whatsapp ?? '',
    token: e.token,
    status: e.status as Status,
    dados: e.dados,
    criado_em: e.criadoEm,
    terminou_em: e.terminouEm,
  };
}

export async function envioPorToken(token: string) {
  const e = await buscarEnvioPorToken(token);
  if (!e || e.excluidoEm) return null;
  return e;
}

export async function envioComCliente(id: string) {
  const e = await buscar<Envio>('envios', id);
  if (!e) return null;
  const c = await buscar<Cliente>('clientes', e.clienteId);
  return { envio: e, cliente: c, artesa: comoArtesa(e, c) };
}

// ---------- files ----------

export async function salvarFoto(envioId: string, conteudo: Buffer, tipo: string): Promise<string> {
  const caminho = `${envioId}/${randomUUID()}.${tipo === 'image/png' ? 'png' : 'jpg'}`;
  await salvarArquivo(caminho, conteudo);
  return caminho;
}

/** Only accepts paths created by salvarFoto or novoArquivo ("<uuid>/<uuid>.<ext>"). */
export function caminhoValido(caminho: string) {
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|pdf|mp4|mov|m4v|webm|3gp)$/.test(caminho) && caminhoSeguro(caminho);
}

/** Prepares a PDF or video upload; the browser then sends the file to PUT /api/envio/<token>/arquivo. */
export async function novoArquivo(envioId: string, ext: string): Promise<{ path: string; url: null }> {
  return { path: `${envioId}/${randomUUID()}.${ext}`, url: null };
}

export const lerFoto = lerArquivo;
