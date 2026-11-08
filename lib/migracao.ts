import 'server-only';
import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buscar, gravar } from './db';
import { caminhoSeguro, lerArquivo, salvarArquivo } from './arquivos';
import { Cliente, Envio, Evento, Pagamento, Pedido, Situacao, paraCentavos } from './modelo';
import { Dados, Status } from './types';

/**
 * Brings the data of the old system (Supabase) into the new one. It only READS from Supabase: nothing
 * there is changed or deleted, so the old system keeps working until the switch.
 *
 * Each old artisan becomes a client + an order + its content (envio). The content keeps the same id and
 * the same link token, so every link already sent keeps working and the file paths stay the same.
 * Running it again is safe: whatever was already imported is skipped.
 */

const BUCKET = 'fotos';

type ArtesaAntiga = {
  id: string;
  nome: string;
  atelie: string;
  whatsapp: string;
  token: string;
  status: Status | 'em_producao' | 'entregue';
  dados: Dados;
  criado_em: string;
  terminou_em: string | null;
};

type FichaAntiga = {
  nome?: string;
  artesaId?: string;
  terminouEnvio?: string;
  tipo?: string;
  previsao?: string;
  entregueEm?: string;
  valor?: string;
  pagamento?: string;
  enderecoSite?: string;
  renovacaoDominio?: string;
  notas?: string;
  arquivos?: { path: string; nome: string; tamanho?: number; categoria?: string; enviadoEm?: string }[];
};

export function migracaoConfigurada() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabase(): SupabaseClient {
  if (!migracaoConfigurada()) throw new Error('Coloque SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis do servidor');
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

const dia = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : '');
const ymd = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');

const SITUACAO: Record<ArtesaAntiga['status'], Situacao> = {
  nao_comecou: 'aguardando',
  enviando: 'enviando',
  terminou: 'enviado',
  em_producao: 'dev',
  entregue: 'entregue',
};

async function lerFichas(sb: SupabaseClient): Promise<Record<string, FichaAntiga>> {
  const { data, error } = await sb.storage.from(BUCKET).download('painel/fichas.json');
  if (error || !data) return {};
  const bruto = JSON.parse(await data.text()) as Record<string, FichaAntiga>;
  // Early entries were keyed by the artisan id and had no name of their own.
  return Object.fromEntries(Object.entries(bruto).map(([id, f]) => [id, f.nome === undefined ? { ...f, artesaId: id } : f]));
}

/** What will be imported, for the progress bar. */
export async function listarParaMigrar() {
  const sb = supabase();
  const { data, error } = await sb.from('artesas').select('id').order('criado_em', { ascending: true });
  if (error) throw new Error(`Não consegui ler o Supabase: ${error.message}`);
  const fichas = await lerFichas(sb);
  const ids = new Set((data ?? []).map((a) => a.id as string));
  const avulsas = Object.entries(fichas)
    .filter(([, f]) => !f.artesaId || !ids.has(f.artesaId))
    .map(([id]) => id);
  return { artesas: [...ids], avulsas };
}

/** Copies one file from Supabase to the disk, unless it is already there. Returns false when it failed. */
async function copiar(sb: SupabaseClient, caminho: string) {
  if (!caminhoSeguro(caminho)) return true;
  if (await lerArquivo(caminho)) return true;
  const { data, error } = await sb.storage.from(BUCKET).download(caminho);
  if (error || !data) return false;
  await salvarArquivo(caminho, Buffer.from(await data.arrayBuffer()));
  return true;
}

async function copiarPasta(sb: SupabaseClient, pasta: string) {
  let copiados = 0;
  let falhas = 0;
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await sb.storage.from(BUCKET).list(pasta, { limit: 1000, offset: inicio });
    if (error || !data?.length) break;
    for (const f of data) {
      if (!f.id) continue; // a sub-folder
      if (await copiar(sb, `${pasta}/${f.name}`)) copiados++;
      else falhas++;
    }
    if (data.length < 1000) break;
  }
  return { copiados, falhas };
}

/** Order fields that come from Isa's old agenda entry. */
function dadosDaFicha(f: FichaAntiga | undefined, valorTexto: string[]): Partial<Pedido> {
  if (!f) return {};
  const valor = paraCentavos(f.valor ?? '');
  const p: Partial<Pedido> = {
    fim: ymd(f.previsao),
    entrega: ymd(f.entregueEm),
    valorServico: valor,
    enderecoSite: f.enderecoSite ?? '',
    renovacaoDominio: ymd(f.renovacaoDominio),
    obs: f.notas ?? '',
    mes: (ymd(f.previsao) || ymd(f.entregueEm)).slice(0, 7),
    arquivos: (f.arquivos ?? [])
      .filter((a) => caminhoSeguro(a.path))
      .map((a) => ({
        path: a.path,
        nome: a.nome,
        tamanho: a.tamanho ?? 0,
        categoria: (['site', 'manual', 'acesso', 'outro'].includes(a.categoria ?? '') ? a.categoria : 'outro') as Pedido['arquivos'][number]['categoria'],
        enviadoEm: a.enviadoEm ?? new Date().toISOString(),
      })),
  };
  if (f.tipo === 'Site no Canva') p.tipoSite = 'Canva';
  if (f.tipo === 'Migração') p.servico = 'Migração';
  if (f.tipo && f.tipo !== 'Site no Canva') valorTexto.push(`Tipo no sistema antigo: ${f.tipo}`);
  // The old agenda only said "Sinal pago" / "Pago", without amount, date or method.
  if (f.pagamento === 'Pago' && valor > 0) {
    const pg: Pagamento = { id: randomUUID(), data: ymd(f.entregueEm) || dia(new Date().toISOString()), valor, forma: '', obs: 'Trazido do sistema antigo (marcado como Pago). Confira data e forma.' };
    p.pagamentos = [pg];
  } else if (f.pagamento === 'Sinal pago') {
    p.obsFinanceiras = 'No sistema antigo estava “Sinal pago”, sem o valor. Registre o pagamento do sinal aqui.';
  }
  return p;
}

function pedidoBase(id: string, clienteId: string, envioId: string, criadoEm: string): Pedido {
  return {
    id,
    clienteId,
    tipoSite: '',
    servico: '',
    adicionais: [],
    situacao: 'aguardando',
    contratacao: dia(criadoEm),
    mes: '',
    inicio: '',
    fim: '',
    entrega: '',
    valorServico: 0,
    valorAdicionais: 0,
    pagamentos: [],
    saldoPrevisto: '',
    obsFinanceiras: '',
    obs: '',
    enderecoSite: '',
    renovacaoDominio: '',
    arquivos: [],
    envioId,
    criadoEm,
  };
}

async function anotar(clienteId: string, pedidoId: string, data: string) {
  const e: Evento = { id: randomUUID(), clienteId, pedidoId, data, texto: 'Trazida do sistema antigo de envio' };
  await gravar('historico', e);
}

/** Imports one old artisan (client + order + content + photos). Ids are reused, so a re-run skips it. */
export async function migrarArtesa(id: string) {
  const sb = supabase();
  const { data, error } = await sb.from('artesas').select('*').eq('id', id).maybeSingle();
  if (error || !data) throw new Error('Artesã não encontrada no Supabase');
  const a = data as ArtesaAntiga;
  const fichas = await lerFichas(sb);
  const ficha = Object.values(fichas).find((f) => f.artesaId === a.id);

  const novo = !(await buscar<Envio>('envios', a.id));
  if (novo) {
    const cliente: Cliente = {
      id: a.id,
      nome: a.nome,
      atelie: a.atelie,
      whatsapp: (a.whatsapp ?? '').replace(/\D/g, ''),
      instagram: a.dados?.links?.instagram ?? '',
      email: a.dados?.dominio?.email ?? '',
      contratacao: dia(a.criado_em),
      obs: '',
      criadoEm: a.criado_em,
    };
    if (!(await buscar<Cliente>('clientes', cliente.id))) await gravar('clientes', cliente);

    const extras: string[] = [];
    const pedido: Pedido = { ...pedidoBase(a.id, a.id, a.id, a.criado_em), situacao: SITUACAO[a.status] ?? 'aguardando', ...dadosDaFicha(ficha, extras) };
    if (extras.length) pedido.obs = [pedido.obs, ...extras].filter(Boolean).join('\n');
    if (pedido.situacao === 'entregue' && !pedido.entrega) pedido.entrega = dia(a.terminou_em ?? a.criado_em);
    await gravar('pedidos', pedido);

    const terminou = ['terminou', 'em_producao', 'entregue'].includes(a.status);
    const envio: Envio = {
      id: a.id,
      pedidoId: a.id,
      clienteId: a.id,
      token: a.token,
      status: terminou ? 'terminou' : a.status === 'enviando' ? 'enviando' : 'nao_comecou',
      dados: a.dados,
      criadoEm: a.criado_em,
      comecouEm: a.status === 'nao_comecou' ? null : a.criado_em,
      ultimoEnvioEm: a.status === 'nao_comecou' ? null : (a.terminou_em ?? a.criado_em),
      terminouEm: terminou ? (a.terminou_em ?? (ficha?.terminouEnvio ? `${ficha.terminouEnvio}T12:00:00.000Z` : null)) : null,
    };
    await gravar('envios', envio, envio.token);
    await anotar(a.id, a.id, a.criado_em);
  }

  // Files are copied every run, so an import interrupted halfway finishes the next time.
  const r = await copiarPasta(sb, a.id);
  for (const arq of ficha?.arquivos ?? []) if (!(await copiar(sb, arq.path))) r.falhas++;
  return { nome: a.atelie || a.nome, novo, ...r };
}

/** Imports an agenda entry that had no artisan link ("fora do sistema"): a client + an order with no content link. */
export async function migrarAvulsa(fichaId: string) {
  const sb = supabase();
  const f = (await lerFichas(sb))[fichaId];
  if (!f) throw new Error('Ficha não encontrada');
  const novo = !(await buscar<Pedido>('pedidos', fichaId));
  if (novo) {
    const agora = new Date().toISOString();
    const cliente: Cliente = { id: fichaId, nome: f.nome || 'Sem nome', atelie: '', whatsapp: '', instagram: '', email: '', contratacao: '', obs: '', criadoEm: agora };
    if (!(await buscar<Cliente>('clientes', fichaId))) await gravar('clientes', cliente);
    const extras: string[] = [];
    const pedido: Pedido = { ...pedidoBase(fichaId, fichaId, '', agora), contratacao: '', ...dadosDaFicha(f, extras) };
    pedido.situacao = pedido.entrega ? 'entregue' : ymd(f.terminouEnvio) ? 'enviado' : 'aguardando';
    pedido.obs = [pedido.obs, ...extras, 'Veio da agenda antiga, sem link de envio.'].filter(Boolean).join('\n');
    await gravar('pedidos', pedido);
    await anotar(fichaId, fichaId, agora);
  }
  let falhas = 0;
  for (const arq of f.arquivos ?? []) if (!(await copiar(sb, arq.path))) falhas++;
  return { nome: f.nome || 'Sem nome', novo, copiados: 0, falhas };
}
