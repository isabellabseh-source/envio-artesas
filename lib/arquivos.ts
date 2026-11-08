import 'server-only';
import { createWriteStream, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

/**
 * Photos, videos and PDFs, kept on the server's disk.
 * PASTA_ARQUIVOS should point OUTSIDE the app folder (e.g. /home/<user>/arquivos-painel), so that publishing
 * a new version of the system never erases what the artisans sent.
 */

export function pastaArquivos() {
  return process.env.PASTA_ARQUIVOS || path.join(pastaDados(), 'arquivos');
}

/**
 * Where data lives when no folder is set. On the server (production) it is a folder in the account's
 * home, OUTSIDE the app: a new deploy may replace the app folder, and the photos must survive it.
 */
export function pastaDados() {
  if (process.env.PASTA_DADOS) return process.env.PASTA_DADOS;
  return process.env.NODE_ENV === 'production' && !process.env.TESTE_LOCAL
    ? path.join(os.homedir(), 'dados-painel-isa')
    : path.join(process.cwd(), '.data');
}

/** Only paths the system itself creates: "<uuid>/<uuid>.<ext>" or "painel/<uuid>/<uuid>.<ext>". */
const VALIDO = /^(painel\/)?[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;
export const caminhoSeguro = (c: string) => VALIDO.test(c);

function absoluto(caminho: string) {
  if (!caminhoSeguro(caminho)) throw new Error('Caminho inválido');
  return path.join(pastaArquivos(), caminho);
}

export async function salvarArquivo(caminho: string, conteudo: Buffer | Uint8Array) {
  const destino = absoluto(caminho);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, conteudo);
}

/** Saves an upload straight to disk without holding it in memory; stops if it passes `maxBytes`. */
export async function salvarFluxo(caminho: string, corpo: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!corpo) throw new Error('Arquivo vazio');
  const destino = absoluto(caminho);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  let total = 0;
  const limite = new Transform({
    transform(pedaco: Buffer, _enc, feito) {
      total += pedaco.length;
      if (total > maxBytes) feito(new Error('Arquivo muito grande'));
      else feito(null, pedaco);
    },
  });
  try {
    await pipeline(Readable.fromWeb(corpo as import('stream/web').ReadableStream), limite, createWriteStream(destino));
  } catch (e) {
    await fs.rm(destino, { force: true });
    throw e;
  }
  return total;
}

export async function lerArquivo(caminho: string): Promise<Buffer | null> {
  if (!caminhoSeguro(caminho)) return null;
  try {
    return await fs.readFile(absoluto(caminho));
  } catch {
    return null;
  }
}

export async function apagarArquivo(caminho: string) {
  if (!caminhoSeguro(caminho)) return;
  await fs.rm(absoluto(caminho), { force: true });
}

/** Removes a whole folder: one artisan's files ("<id>") or one order's delivered files ("painel/<id>"). */
export async function apagarPasta(pasta: string) {
  if (!/^(painel\/)?[0-9a-f-]{36}$/.test(pasta)) return;
  await fs.rm(path.join(pastaArquivos(), pasta), { recursive: true, force: true });
}

async function tamanhoDe(alvo: string): Promise<{ bytes: number; arquivos: number }> {
  let bytes = 0;
  let arquivos = 0;
  let itens: import('fs').Dirent[];
  try {
    itens = await fs.readdir(alvo, { withFileTypes: true });
  } catch {
    return { bytes, arquivos };
  }
  for (const it of itens) {
    const p = path.join(alvo, it.name);
    if (it.isDirectory()) {
      const r = await tamanhoDe(p);
      bytes += r.bytes;
      arquivos += r.arquivos;
    } else if (it.isFile()) {
      bytes += (await fs.stat(p)).size;
      arquivos += 1;
    }
  }
  return { bytes, arquivos };
}

/** Space used by everything the system stores, and by one folder. */
export const usoTotal = () => tamanhoDe(pastaArquivos());
export const usoPasta = (pasta: string) =>
  /^(painel\/)?[0-9a-f-]{36}$/.test(pasta) ? tamanhoDe(path.join(pastaArquivos(), pasta)) : Promise.resolve({ bytes: 0, arquivos: 0 });
