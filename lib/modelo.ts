/** The business records (clients, orders, payments) and the calculations shared by every page. */

import { Dados, progresso } from './types';

// ---------- lists ----------

export const TIPOS_SITE = ['Canva', 'Site com carrinho'] as const;
export type TipoSite = (typeof TIPOS_SITE)[number];

export const SERVICOS = [
  'Site completo no Canva com catálogo de temas',
  'Site com carrinho com catálogo de temas',
  'Site no Canva sem catálogo de temas',
  'Site com carrinho sem catálogo de temas',
  'Migração',
] as const;

export const ADICIONAIS = ['Melhoria de fotos', 'Precificação e financeiro'] as const;

export const FORMAS_PAGAMENTO = ['Pix', 'Cartão de crédito', 'Dinheiro', 'Transferência'] as const;

export const SITUACOES = {
  aguardando: 'Aguardando envio de conteúdo',
  enviando: 'Enviando conteúdo',
  enviado: 'Conteúdo enviado',
  pausa: 'Pausa a pedido do cliente',
  dev: 'Em desenvolvimento',
  aprovacao: 'Aguardando aprovação',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
} as const;
export type Situacao = keyof typeof SITUACOES;
export const ehSituacao = (s: unknown): s is Situacao => typeof s === 'string' && s in SITUACOES;

export const SITUACOES_FIN = { nao: 'Não pago', parcial: 'Parcialmente pago', pago: 'Pago integralmente' } as const;
export type SituacaoFin = keyof typeof SITUACOES_FIN;

export const STATUS_ENVIO = { nao_comecou: 'Não começou', enviando: 'Em andamento', terminou: 'Completo' } as const;
export type StatusEnvio = keyof typeof STATUS_ENVIO;

export const CATEGORIAS_ARQUIVO = { site: 'Arquivo do site', manual: 'Manual (PDF)', acesso: 'Acessos (PDF)', outro: 'Outro' } as const;
export type CategoriaArquivo = keyof typeof CATEGORIAS_ARQUIVO;

// ---------- records ----------

export type Cliente = {
  id: string;
  nome: string;
  atelie: string;
  /** Digits only. */
  whatsapp: string;
  instagram: string;
  email: string;
  /** YYYY-MM-DD */
  contratacao: string;
  obs: string;
  criadoEm: string;
  /** Set when sent to the bin; removed for good 30 days later. */
  excluidoEm?: string;
};

/** Amounts are kept in cents, so sums never get rounding errors. */
export type Pagamento = { id: string; data: string; valor: number; forma: string; obs: string };

export type ArquivoEntregue = { path: string; nome: string; tamanho: number; categoria: CategoriaArquivo; enviadoEm: string };

export type Pedido = {
  id: string;
  clienteId: string;
  tipoSite: TipoSite | '';
  servico: string;
  adicionais: string[];
  situacao: Situacao;
  /** All dates YYYY-MM-DD; mes is YYYY-MM (the month that holds the slot). */
  contratacao: string;
  mes: string;
  inicio: string;
  fim: string;
  entrega: string;
  valorServico: number;
  valorAdicionais: number;
  pagamentos: Pagamento[];
  saldoPrevisto: string;
  obsFinanceiras: string;
  obs: string;
  enderecoSite: string;
  renovacaoDominio: string;
  arquivos: ArquivoEntregue[];
  envioId: string;
  criadoEm: string;
  excluidoEm?: string;
};

/** What an artisan fills in through her link (one per order). */
export type Envio = {
  id: string;
  pedidoId: string;
  clienteId: string;
  token: string;
  status: StatusEnvio;
  dados: Dados;
  criadoEm: string;
  comecouEm: string | null;
  ultimoEnvioEm: string | null;
  terminouEm: string | null;
  /** Set when Isa downloaded the photos and freed the space after delivery. */
  arquivosLiberadosEm?: string;
  excluidoEm?: string;
};

export type Evento = { id: string; clienteId: string; pedidoId?: string; data: string; texto: string };

export type ConfigVagas = { id: 'vagas'; padrao: number; meses: Record<string, number> };

// ---------- calculations ----------

export const total = (p: Pick<Pedido, 'valorServico' | 'valorAdicionais'>) => p.valorServico + p.valorAdicionais;
export const pago = (p: Pick<Pedido, 'pagamentos'>) => p.pagamentos.reduce((t, x) => t + x.valor, 0);
export const saldo = (p: Pedido) => Math.max(0, total(p) - pago(p));
export function situacaoFin(p: Pedido): SituacaoFin {
  const pg = pago(p);
  if (pg <= 0) return total(p) > 0 ? 'nao' : 'pago';
  return pg >= total(p) ? 'pago' : 'parcial';
}

export const aberto = (p: Pedido) => p.situacao !== 'finalizado' && p.situacao !== 'entregue';

/** Today in Brazil, as YYYY-MM-DD. */
export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export const atrasado = (p: Pedido, hj = hoje()) => aberto(p) && !!p.fim && p.fim < hj;
export const diasAte = (ymd: string, hj = hoje()) => Math.round((Date.parse(`${ymd}T12:00:00Z`) - Date.parse(`${hj}T12:00:00Z`)) / 864e5);

export function vagasDoMes(cfg: ConfigVagas, mes: string) {
  return cfg.meses[mes] ?? cfg.padrao;
}

/** Content checklist, from the real sections of the artisan form. */
export function checklist(d: Dados) {
  const produtos = d.categorias.flatMap((c) => c.produtos);
  const temProdutos = produtos.length > 0;
  const itens = [
    { nome: 'Categorias', ok: d.categorias.length > 0 && d.categorias.every((c) => c.nome.trim()) },
    { nome: 'Fotos dos produtos', ok: temProdutos && produtos.every((p) => p.fotos.length > 0) },
    { nome: 'Preços', ok: temProdutos && produtos.every((p) => p.valor.trim() || (p.temVariacoes && p.variacoes.some((v) => v.valor.trim()))) },
    { nome: 'Logo', ok: !!d.identidade.logo },
    { nome: 'Identidade visual', ok: !!d.identidade.tema },
    { nome: 'Sobre o ateliê', ok: !!d.sobre.texto.trim() },
    { nome: 'Formas de pagamento', ok: d.comercial.pagamentos.length > 0 || !!d.comercial.pagamentoOutro.trim() },
    { nome: 'Formas de envio', ok: d.comercial.envios.length > 0 || !!d.comercial.envioOutro.trim() },
    { nome: 'Depoimentos', ok: d.depoimentos.length > 0, opcional: true },
    { nome: 'Links', ok: !!d.links.whatsapp.trim() },
    { nome: 'Dados do domínio', ok: progresso(d).secoes.find((s) => s.id === 'dominio')?.ok ?? false },
  ];
  const obrigatorios = itens.filter((i) => !i.opcional);
  const feitos = obrigatorios.filter((i) => i.ok).length;
  return { itens, feitos, total: obrigatorios.length, pct: Math.round((feitos / obrigatorios.length) * 100), produtos: produtos.length };
}

// ---------- formatting ----------

export const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
/** "1.250,50", "1250.5", "R$ 700" → cents. */
export function paraCentavos(v: string | number): number {
  if (typeof v === 'number') return Math.round(v * 100);
  const limpo = v.replace(/[^\d,.-]/g, '');
  const n = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
export const centavosParaTexto = (c: number) => (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dataBr = (ymd?: string | null) => (ymd ? ymd.slice(0, 10).split('-').reverse().join('/') : '—');
export const dataHoraBr = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (n: number) => MESES[n - 1];
export function mesBr(ym?: string) {
  if (!ym) return '—';
  const [a, m] = ym.split('-');
  return `${MESES[Number(m) - 1]} de ${a}`;
}
export const mesCurto = (ym?: string) => (ym ? `${MESES[Number(ym.slice(5, 7)) - 1].slice(0, 3)}/${ym.slice(2, 4)}` : '—');
export const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export function somarMeses(ym: string, n: number) {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export const telefoneBr = (d: string) => {
  const n = d.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return d;
};
export const linkZap = (d: string, texto?: string) => {
  const n = d.replace(/\D/g, '');
  const numero = n.length <= 11 ? `55${n}` : n;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
};

/** "850 MB" or "2,4 GB". */
export function tamanhoBr(bytes: number) {
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toLocaleString('pt-BR', { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
  return `${(mb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
}
