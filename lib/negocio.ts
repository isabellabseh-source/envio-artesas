import 'server-only';
import { randomBytes, randomUUID } from 'crypto';
import { apagar, atualizar, buscar, buscarPorChave, gravar, listar } from './db';
import { apagarArquivo, apagarPasta } from './arquivos';
import {
  ADICIONAIS,
  Cliente,
  ConfigVagas,
  Envio,
  Evento,
  FORMAS_PAGAMENTO,
  Pagamento,
  Pedido,
  SITUACOES,
  Situacao,
  TIPOS_SITE,
  TipoSite,
  checklist,
  dataBr,
  ehSituacao,
  hoje,
  mesBr,
  paraCentavos,
  reais,
  saldo,
} from './modelo';
import { Dados, dadosVazios } from './types';

/** Business rules: every change to clients, orders, payments and content goes through here. */

export const novoToken = () => randomBytes(18).toString('base64url');
const agoraIso = () => new Date().toISOString();
const texto = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const data = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const mes = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) ? v : '');
const DIAS_LIXEIRA = 30;

// ---------- history ----------

export async function registrar(clienteId: string, textoEvento: string, pedidoId?: string) {
  const e: Evento = { id: randomUUID(), clienteId, pedidoId, data: agoraIso(), texto: textoEvento.slice(0, 500) };
  await gravar('historico', e);
}

export async function historicoDe(clienteId: string) {
  return (await listar<Evento>('historico')).filter((e) => e.clienteId === clienteId).sort((a, b) => b.data.localeCompare(a.data));
}

// ---------- clients ----------

export type EntradaCliente = Partial<Record<'nome' | 'atelie' | 'whatsapp' | 'instagram' | 'email' | 'contratacao' | 'obs', string>>;

function limparCliente(e: EntradaCliente) {
  return {
    nome: texto(e.nome, 200),
    atelie: texto(e.atelie, 200),
    whatsapp: texto(e.whatsapp, 40).replace(/\D/g, ''),
    instagram: texto(e.instagram, 100),
    email: texto(e.email, 200),
    contratacao: data(e.contratacao),
    obs: texto(e.obs),
  };
}

export async function criarCliente(e: EntradaCliente): Promise<Cliente> {
  const c: Cliente = { id: randomUUID(), ...limparCliente(e), criadoEm: agoraIso() };
  if (!c.contratacao) c.contratacao = hoje();
  if (!c.nome) throw new Erro('Informe o nome da artesã');
  await gravar('clientes', c);
  await registrar(c.id, 'Cadastrada no painel');
  return c;
}

export async function atualizarCliente(id: string, e: EntradaCliente) {
  const novo = limparCliente(e);
  if (!novo.nome) throw new Erro('Informe o nome da artesã');
  return atualizar<Cliente>('clientes', id, (c) => {
    Object.assign(c, novo);
    if (!c.contratacao) c.contratacao = hoje();
  });
}

// ---------- orders ----------

export type EntradaPedido = Partial<{
  clienteId: string;
  tipoSite: string;
  servico: string;
  adicionais: string[];
  situacao: string;
  contratacao: string;
  mes: string;
  inicio: string;
  fim: string;
  entrega: string;
  valorServico: string | number;
  valorAdicionais: string | number;
  saldoPrevisto: string;
  obsFinanceiras: string;
  obs: string;
  enderecoSite: string;
  renovacaoDominio: string;
}>;

function limparPedido(e: EntradaPedido): Partial<Pedido> {
  const r: Partial<Pedido> = {};
  if ('tipoSite' in e) r.tipoSite = (TIPOS_SITE as readonly string[]).includes(e.tipoSite ?? '') ? (e.tipoSite as TipoSite) : '';
  if ('servico' in e) r.servico = texto(e.servico, 200);
  if ('adicionais' in e) r.adicionais = (e.adicionais ?? []).filter((a) => (ADICIONAIS as readonly string[]).includes(a));
  if ('situacao' in e && ehSituacao(e.situacao)) r.situacao = e.situacao;
  for (const k of ['contratacao', 'inicio', 'fim', 'entrega', 'saldoPrevisto', 'renovacaoDominio'] as const) if (k in e) r[k] = data(e[k]);
  if ('mes' in e) r.mes = mes(e.mes);
  if ('valorServico' in e) r.valorServico = Math.max(0, paraCentavos(e.valorServico ?? 0));
  if ('valorAdicionais' in e) r.valorAdicionais = Math.max(0, paraCentavos(e.valorAdicionais ?? 0));
  for (const k of ['obsFinanceiras', 'obs', 'enderecoSite'] as const) if (k in e) r[k] = texto(e[k]);
  return r;
}

/** New order: it takes a slot in its month right away and gets its own content link. */
export async function criarPedido(e: EntradaPedido): Promise<Pedido> {
  const cliente = await buscar<Cliente>('clientes', e.clienteId ?? '');
  if (!cliente || cliente.excluidoEm) throw new Erro('Escolha uma artesã cadastrada');
  const id = randomUUID();
  const envioId = randomUUID();
  const p: Pedido = {
    id,
    clienteId: cliente.id,
    tipoSite: '',
    servico: '',
    adicionais: [],
    situacao: 'aguardando',
    contratacao: hoje(),
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
    criadoEm: agoraIso(),
    ...limparPedido(e),
  };
  if (!p.contratacao) p.contratacao = hoje();
  if (!p.mes && p.inicio) p.mes = p.inicio.slice(0, 7);
  await gravar('pedidos', p);
  await criarEnvio(p, cliente);
  await registrar(cliente.id, `Novo pedido: ${p.servico || 'serviço'}${p.mes ? ` para ${mesBr(p.mes)}` : ''}`, id);
  return p;
}

export async function criarEnvio(p: Pedido, c: Cliente, idDesejado?: string) {
  const envio: Envio = {
    id: idDesejado ?? p.envioId,
    pedidoId: p.id,
    clienteId: c.id,
    token: novoToken(),
    status: 'nao_comecou',
    dados: dadosVazios(c.atelie),
    criadoEm: agoraIso(),
    comecouEm: null,
    ultimoEnvioEm: null,
    terminouEm: null,
  };
  await gravar('envios', envio, envio.token);
  return envio;
}

/** Orders brought from the old agenda have no content link; this creates one. */
export async function criarLinkEnvio(pedidoId: string) {
  const p = await buscar<Pedido>('pedidos', pedidoId);
  if (!p || p.excluidoEm) throw new Erro('Pedido não encontrado');
  if (p.envioId && (await buscar<Envio>('envios', p.envioId))) throw new Erro('Este pedido já tem link');
  const c = await buscar<Cliente>('clientes', p.clienteId);
  if (!c) throw new Erro('Artesã não encontrada');
  const envioId = randomUUID();
  await atualizar<Pedido>('pedidos', p.id, (x) => void (x.envioId = envioId));
  await criarEnvio({ ...p, envioId }, c);
  await registrar(c.id, 'Link de envio de conteúdo criado', p.id);
}

export async function atualizarPedido(id: string, e: EntradaPedido) {
  const novo = limparPedido(e);
  let antes: Pedido | null = null;
  const p = await atualizar<Pedido>('pedidos', id, (p) => {
    antes = structuredClone(p);
    Object.assign(p, novo);
    if (novo.situacao === 'entregue' && !p.entrega) p.entrega = hoje();
  });
  if (p && antes) await registrarMudancas(antes, p);
  return p;
}

async function registrarMudancas(a: Pedido, p: Pedido) {
  if (a.situacao !== p.situacao) await registrar(p.clienteId, `Situação: ${SITUACOES[p.situacao]}`, p.id);
  if (a.mes !== p.mes && p.mes) await registrar(p.clienteId, `Reagendado${a.mes ? ` de ${mesBr(a.mes)}` : ''} para ${mesBr(p.mes)}`, p.id);
  if (a.entrega !== p.entrega && p.entrega) await registrar(p.clienteId, `Site entregue em ${dataBr(p.entrega)}`, p.id);
}

export async function mudarSituacao(id: string, s: Situacao) {
  return atualizarPedido(id, { situacao: s });
}

export async function registrarPagamento(id: string, e: { data?: string; valor?: string | number; forma?: string; obs?: string }) {
  const valor = paraCentavos(e.valor ?? 0);
  if (!(valor > 0)) throw new Erro('Digite um valor maior que zero');
  const forma = (FORMAS_PAGAMENTO as readonly string[]).includes(e.forma ?? '') ? e.forma! : 'Pix';
  const pg: Pagamento = { id: randomUUID(), data: data(e.data) || hoje(), valor, forma, obs: texto(e.obs, 500) };
  const p = await atualizar<Pedido>('pedidos', id, (p) => void p.pagamentos.push(pg));
  if (p) await registrar(p.clienteId, `Pagamento de ${reais(valor)} por ${forma}${saldo(p) > 0 ? ` (faltam ${reais(saldo(p))})` : ' (pago integralmente)'}`, p.id);
  return p;
}

export async function removerPagamento(id: string, pagamentoId: string) {
  let removido: Pagamento | undefined;
  const p = await atualizar<Pedido>('pedidos', id, (p) => {
    removido = p.pagamentos.find((x) => x.id === pagamentoId);
    p.pagamentos = p.pagamentos.filter((x) => x.id !== pagamentoId);
  });
  if (p && removido) await registrar(p.clienteId, `Pagamento de ${reais(removido.valor)} de ${dataBr(removido.data)} removido`, p.id);
  return p;
}

// ---------- content sent by the artisan ----------

export const buscarEnvioPorToken = (token: string) => (token && token.length >= 16 ? buscarPorChave<Envio>('envios', token) : Promise.resolve(null));

/**
 * The artisan saved part of her content. The order moves to "Enviando conteúdo" only while it is still
 * "Aguardando envio de conteúdo": a pause or any status Isa chose is never overwritten.
 */
export async function salvarConteudo(envio: Envio, dados: Dados) {
  const primeiraVez = envio.status === 'nao_comecou';
  const agora = agoraIso();
  await atualizar<Envio>('envios', envio.id, (e) => {
    e.dados = dados;
    e.ultimoEnvioEm = agora;
    if (e.status === 'nao_comecou') {
      e.status = 'enviando';
      e.comecouEm = agora;
    }
  });
  if (primeiraVez) {
    const p = await atualizar<Pedido>('pedidos', envio.pedidoId, (p) => {
      if (p.situacao === 'aguardando') p.situacao = 'enviando';
    });
    if (p) await registrar(p.clienteId, 'Começou a enviar o conteúdo', p.id);
  }
}

/** The artisan pressed "Terminei". The order moves to "Conteúdo enviado" only from the two initial statuses. */
export async function finalizarConteudo(envio: Envio) {
  if (envio.status === 'terminou') return;
  const agora = agoraIso();
  await atualizar<Envio>('envios', envio.id, (e) => {
    e.status = 'terminou';
    e.terminouEm = agora;
    e.ultimoEnvioEm = agora;
    e.comecouEm ??= agora;
  });
  const p = await atualizar<Pedido>('pedidos', envio.pedidoId, (p) => {
    if (p.situacao === 'aguardando' || p.situacao === 'enviando') p.situacao = 'enviado';
  });
  if (p) await registrar(p.clienteId, 'Terminou o envio de conteúdo', p.id);
}

export async function reabrirEnvio(envioId: string) {
  const e = await atualizar<Envio>('envios', envioId, (e) => {
    e.status = 'enviando';
    e.terminouEm = null;
  });
  if (e) await registrar(e.clienteId, 'Envio de conteúdo reaberto', e.pedidoId);
  return e;
}

export async function gerarNovoLink(envioId: string) {
  const token = novoToken();
  const e = await atualizar<Envio>(
    'envios',
    envioId,
    (e) => void (e.token = token),
    (e) => e.token,
  );
  if (e) await registrar(e.clienteId, 'Novo link de envio gerado (o anterior parou de funcionar)', e.pedidoId);
  return e;
}

// ---------- slots per month ----------

export async function lerVagas(): Promise<ConfigVagas> {
  return (await buscar<ConfigVagas>('config', 'vagas')) ?? { id: 'vagas', padrao: 20, meses: {} };
}

export async function salvarVagas(padrao: number, meses: Record<string, number>) {
  const limpos: Record<string, number> = {};
  for (const [k, v] of Object.entries(meses)) if (/^\d{4}-\d{2}$/.test(k) && Number.isFinite(v)) limpos[k] = Math.max(0, Math.round(v));
  const cfg: ConfigVagas = { id: 'vagas', padrao: Math.max(0, Math.round(padrao) || 0), meses: limpos };
  await gravar('config', cfg);
  return cfg;
}

// ---------- bin (deleted items wait 30 days) ----------

export async function excluirCliente(id: string) {
  const agora = agoraIso();
  const c = await atualizar<Cliente>('clientes', id, (c) => void (c.excluidoEm = agora));
  if (!c) return false;
  for (const p of (await listar<Pedido>('pedidos')).filter((p) => p.clienteId === id && !p.excluidoEm)) await excluirPedido(p.id, agora);
  return true;
}

export async function excluirPedido(id: string, quando = agoraIso()) {
  const p = await atualizar<Pedido>('pedidos', id, (p) => void (p.excluidoEm = quando));
  if (!p) return false;
  await atualizar<Envio>('envios', p.envioId, (e) => void (e.excluidoEm = quando));
  await registrar(p.clienteId, `Pedido excluído: ${p.servico || 'serviço'}`, p.id);
  return true;
}

export async function restaurar(tipo: 'cliente' | 'pedido', id: string) {
  if (tipo === 'cliente') {
    const c = await atualizar<Cliente>('clientes', id, (c) => void delete c.excluidoEm);
    if (!c) return false;
    for (const p of (await listar<Pedido>('pedidos')).filter((p) => p.clienteId === id && p.excluidoEm)) await restaurar('pedido', p.id);
    return true;
  }
  const p = await atualizar<Pedido>('pedidos', id, (p) => void delete p.excluidoEm);
  if (!p) return false;
  await atualizar<Envio>('envios', p.envioId, (e) => void delete e.excluidoEm);
  await atualizar<Cliente>('clientes', p.clienteId, (c) => void delete c.excluidoEm);
  return true;
}

/** Deletes for good: the order, its content and every file (photos, videos, delivered files). */
async function apagarPedidoDeVez(p: Pedido) {
  for (const a of p.arquivos) await apagarArquivo(a.path);
  await apagarPasta(p.envioId);
  await apagarPasta(`painel/${p.id}`);
  await apagar('envios', p.envioId);
  await apagar('pedidos', p.id);
}

export async function apagarDeVez(tipo: 'cliente' | 'pedido', id: string) {
  if (tipo === 'pedido') {
    const p = await buscar<Pedido>('pedidos', id);
    if (!p?.excluidoEm) return false;
    await apagarPedidoDeVez(p);
    return true;
  }
  const c = await buscar<Cliente>('clientes', id);
  if (!c?.excluidoEm) return false;
  for (const p of (await listar<Pedido>('pedidos')).filter((p) => p.clienteId === id)) await apagarPedidoDeVez(p);
  for (const e of (await listar<Evento>('historico')).filter((e) => e.clienteId === id)) await apagar('historico', e.id);
  await apagar('clientes', id);
  return true;
}

/** Empties items that have been in the bin for more than 30 days. Runs when the panel opens. */
export async function limparLixeiraVencida() {
  const limite = new Date(Date.now() - DIAS_LIXEIRA * 864e5).toISOString();
  for (const c of await listar<Cliente>('clientes')) if (c.excluidoEm && c.excluidoEm < limite) await apagarDeVez('cliente', c.id);
  for (const p of await listar<Pedido>('pedidos')) if (p.excluidoEm && p.excluidoEm < limite) await apagarDeVez('pedido', p.id);
}

// ---------- everything the panel shows ----------

export type ResumoEnvio = {
  id: string;
  token: string;
  status: Envio['status'];
  pct: number;
  itens: { nome: string; ok: boolean; opcional?: boolean }[];
  produtos: number;
  ultimoEnvioEm: string | null;
  terminouEm: string | null;
  arquivosLiberadosEm?: string;
};

export type Linha = { pedido: Pedido; cliente: Cliente; envio: ResumoEnvio | null };

export function resumirEnvio(e: Envio): ResumoEnvio {
  const ch = checklist(e.dados);
  return {
    id: e.id,
    token: e.token,
    status: e.status,
    pct: e.status === 'terminou' ? Math.max(ch.pct, 100) : ch.pct,
    itens: ch.itens,
    produtos: ch.produtos,
    ultimoEnvioEm: e.ultimoEnvioEm,
    terminouEm: e.terminouEm,
    arquivosLiberadosEm: e.arquivosLiberadosEm,
  };
}

/** Loads every active client and order (the bin is left out), joined together. */
export async function carregarPainel() {
  await limparLixeiraVencida().catch(() => undefined);
  const [clientes, pedidos, envios, vagas] = await Promise.all([
    listar<Cliente>('clientes'),
    listar<Pedido>('pedidos'),
    listar<Envio>('envios'),
    lerVagas(),
  ]);
  const ativos = clientes.filter((c) => !c.excluidoEm).sort((a, b) => (a.atelie || a.nome).localeCompare(b.atelie || b.nome, 'pt-BR'));
  const porCliente = new Map(ativos.map((c) => [c.id, c]));
  const porEnvio = new Map(envios.map((e) => [e.id, e]));
  const linhas: Linha[] = pedidos
    .filter((p) => !p.excluidoEm && porCliente.has(p.clienteId))
    .map((p) => {
      const e = porEnvio.get(p.envioId);
      return { pedido: p, cliente: porCliente.get(p.clienteId)!, envio: e ? resumirEnvio(e) : null };
    });
  const lixeira = {
    clientes: clientes.filter((c) => c.excluidoEm),
    pedidos: pedidos.filter((p) => p.excluidoEm && !clientes.find((c) => c.id === p.clienteId)?.excluidoEm),
  };
  return { clientes: ativos, linhas, vagas, lixeira, todosClientes: clientes };
}

export class Erro extends Error {}
