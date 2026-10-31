import 'server-only';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Ficha, fichaVazia } from './types';

/**
 * Isa's site agenda, kept apart from the artisans' data (which the artisan form overwrites).
 * Entries have their own ids; early entries were keyed by the artisan id and are linked to her on read.
 * Stored as one JSON file in the private bucket, so no database change is needed.
 */

const BUCKET = 'fotos';
const ARQUIVO = 'painel/fichas.json';
const LOCAL = path.join(process.cwd(), '.data');

function supabase() {
  if (!process.env.SUPABASE_URL) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function lerFichas(): Promise<Record<string, Ficha>> {
  const sb = supabase();
  try {
    const texto = sb
      ? await (async () => {
          const { data, error } = await sb.storage.from(BUCKET).download(ARQUIVO);
          if (error || !data) return '{}';
          return data.text();
        })()
      : await fs.readFile(path.join(LOCAL, 'painel', 'fichas.json'), 'utf8');
    const bruto = JSON.parse(texto) as Record<string, Partial<Ficha>>;
    return Object.fromEntries(
      Object.entries(bruto).map(([id, f]) => [id, { ...fichaVazia(), ...(f.nome === undefined ? { artesaId: id } : {}), ...f }]),
    );
  } catch {
    return {};
  }
}

async function gravarFichas(fichas: Record<string, Ficha>) {
  const texto = JSON.stringify(fichas);
  const sb = supabase();
  if (!sb) {
    await fs.mkdir(path.join(LOCAL, 'painel'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, 'painel', 'fichas.json'), texto);
    return;
  }
  const { error } = await sb.storage.from(BUCKET).upload(ARQUIVO, texto, { contentType: 'application/json', upsert: true });
  if (error) throw error;
}

export async function lerFicha(id: string): Promise<Ficha | null> {
  return (await lerFichas())[id] ?? null;
}

export async function criarFicha(inicial: Partial<Ficha>): Promise<string> {
  const id = randomUUID();
  const fichas = await lerFichas();
  fichas[id] = { ...fichaVazia(), ...inicial };
  await gravarFichas(fichas);
  return id;
}

/** Changes one agenda entry; mudar receives the latest saved version. Returns null if it does not exist. */
export async function atualizarFicha(id: string, mudar: (f: Ficha) => void): Promise<Ficha | null> {
  const fichas = await lerFichas();
  const f = fichas[id];
  if (!f) return null;
  mudar(f);
  fichas[id] = f;
  await gravarFichas(fichas);
  return f;
}

/** Removes an agenda entry and its delivered files. */
export async function excluirFicha(id: string) {
  const fichas = await lerFichas();
  if (fichas[id]) {
    delete fichas[id];
    await gravarFichas(fichas);
  }
  const sb = supabase();
  if (!sb) return fs.rm(path.join(LOCAL, 'painel', id), { recursive: true, force: true });
  const { data } = await sb.storage.from(BUCKET).list(`painel/${id}`, { limit: 1000 });
  const arquivos = (data ?? []).filter((x) => x.id).map((x) => `painel/${id}/${x.name}`);
  if (arquivos.length) await sb.storage.from(BUCKET).remove(arquivos);
}

export function caminhoPainelValido(caminho: string) {
  return /^painel\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(caminho);
}

/** Prepares a delivered-file upload: a direct-to-storage link on Supabase, null locally. */
export async function novoArquivoPainel(id: string, ext: string) {
  const caminho = `painel/${id}/${randomUUID()}.${ext}`;
  const sb = supabase();
  if (!sb) return { path: caminho, url: null as string | null };
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error || !data) throw error ?? new Error('Falha ao preparar o envio');
  return { path: caminho, url: data.signedUrl as string | null };
}

export async function salvarArquivoPainelLocal(caminho: string, conteudo: Buffer) {
  const destino = path.join(LOCAL, caminho);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, conteudo);
}

/** A temporary download link (Supabase) or the file itself (local). */
export async function abrirArquivoPainel(caminho: string, nome: string): Promise<{ link: string } | { conteudo: Buffer } | null> {
  if (!caminhoPainelValido(caminho)) return null;
  const sb = supabase();
  if (!sb) {
    try {
      return { conteudo: await fs.readFile(path.join(LOCAL, caminho)) };
    } catch {
      return null;
    }
  }
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(caminho, 3600, { download: nome });
  return error || !data ? null : { link: data.signedUrl };
}

export async function apagarArquivoPainel(caminho: string) {
  if (!caminhoPainelValido(caminho)) return;
  const sb = supabase();
  if (!sb) return fs.rm(path.join(LOCAL, caminho), { force: true });
  await sb.storage.from(BUCKET).remove([caminho]);
}
