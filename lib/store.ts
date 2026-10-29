import 'server-only';
import { randomBytes, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Artesa, Dados, Status, dadosVazios } from './types';

/**
 * Data access. Uses Supabase when SUPABASE_URL is set; otherwise keeps everything
 * in the local .data folder so the system can be tried without any account.
 */

const BUCKET = 'fotos';

export function novoToken() {
  return randomBytes(18).toString('base64url');
}

let client: SupabaseClient | null = null;
function supabase() {
  if (!process.env.SUPABASE_URL) return null;
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// ---------- local backend ----------

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'artesas.json');

async function lerLocal(): Promise<Artesa[]> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function gravarLocal(lista: Artesa[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(lista, null, 2));
}

async function atualizarLocal(id: string, mudar: (a: Artesa) => void) {
  const lista = await lerLocal();
  const a = lista.find((x) => x.id === id);
  if (!a) return null;
  mudar(a);
  await gravarLocal(lista);
  return a;
}

// ---------- public API ----------

export async function listarArtesas(): Promise<Artesa[]> {
  const sb = supabase();
  if (!sb) return (await lerLocal()).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const { data, error } = await sb.from('artesas').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  return data as Artesa[];
}

export async function buscarArtesa(id: string): Promise<Artesa | null> {
  const sb = supabase();
  if (!sb) return (await lerLocal()).find((a) => a.id === id) ?? null;
  const { data, error } = await sb.from('artesas').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Artesa | null;
}

export async function buscarPorToken(token: string): Promise<Artesa | null> {
  if (!token || token.length < 16) return null;
  const sb = supabase();
  if (!sb) return (await lerLocal()).find((a) => a.token === token) ?? null;
  const { data, error } = await sb.from('artesas').select('*').eq('token', token).maybeSingle();
  if (error) throw error;
  return data as Artesa | null;
}

export async function criarArtesa(input: { nome: string; atelie: string; whatsapp: string }): Promise<Artesa> {
  const artesa: Artesa = {
    id: randomUUID(),
    nome: input.nome.trim(),
    atelie: input.atelie.trim(),
    whatsapp: input.whatsapp.replace(/\D/g, ''),
    token: novoToken(),
    status: 'nao_comecou',
    dados: dadosVazios(input.atelie.trim()),
    criado_em: new Date().toISOString(),
    terminou_em: null,
  };
  const sb = supabase();
  if (!sb) {
    const lista = await lerLocal();
    lista.push(artesa);
    await gravarLocal(lista);
    return artesa;
  }
  const { error } = await sb.from('artesas').insert(artesa);
  if (error) throw error;
  return artesa;
}

type Mudancas = Partial<Pick<Artesa, 'dados' | 'status' | 'token' | 'terminou_em' | 'nome' | 'atelie' | 'whatsapp'>>;

export async function atualizarArtesa(id: string, mudancas: Mudancas): Promise<Artesa | null> {
  const sb = supabase();
  if (!sb) return atualizarLocal(id, (a) => Object.assign(a, mudancas));
  const { data, error } = await sb.from('artesas').update(mudancas).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data as Artesa | null;
}

export async function salvarDados(artesa: Artesa, dados: Dados) {
  const status: Status = artesa.status === 'nao_comecou' ? 'enviando' : artesa.status;
  return atualizarArtesa(artesa.id, { dados, status });
}

// ---------- photos ----------

export async function salvarFoto(artesaId: string, conteudo: Buffer, tipo: string): Promise<string> {
  const ext = tipo === 'image/png' ? 'png' : 'jpg';
  const caminho = `${artesaId}/${randomUUID()}.${ext}`;
  const sb = supabase();
  if (!sb) {
    const destino = path.join(DATA_DIR, 'fotos', caminho);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, conteudo);
    return caminho;
  }
  const { error } = await sb.storage.from(BUCKET).upload(caminho, conteudo, { contentType: tipo });
  if (error) throw error;
  return caminho;
}

/** Only accepts paths created by salvarFoto ("<uuid>/<uuid>.<ext>"). */
export function caminhoValido(caminho: string) {
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png)$/.test(caminho);
}

export async function lerFoto(caminho: string): Promise<Buffer | null> {
  if (!caminhoValido(caminho)) return null;
  const sb = supabase();
  if (!sb) {
    try {
      return await fs.readFile(path.join(DATA_DIR, 'fotos', caminho));
    } catch {
      return null;
    }
  }
  const { data, error } = await sb.storage.from(BUCKET).download(caminho);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * On Supabase, stores a generated file and returns a temporary download link (1 hour).
 * Hosting platforms cap response size (Vercel: 4.5 MB), so big zips are served from storage.
 * Returns null when running locally, where the file can be sent directly.
 */
export async function linkParaBaixar(caminho: string, conteudo: Uint8Array, tipo: string, nome: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { error } = await sb.storage.from(BUCKET).upload(`downloads/${caminho}`, conteudo, { contentType: tipo, upsert: true });
  if (error) throw error;
  const { data, error: e2 } = await sb.storage.from(BUCKET).createSignedUrl(`downloads/${caminho}`, 3600, { download: nome });
  if (e2 || !data) throw e2 ?? new Error('Falha ao gerar link');
  return data.signedUrl;
}
