export type Foto = { path: string };

export type Variacao = { tamanho: string; valor: string };

export type Produto = {
  id: string;
  nome: string;
  valor: string;
  tamanho: string;
  obs: string;
  temVariacoes: boolean;
  variacoes: Variacao[];
  fotos: Foto[];
};

export type Categoria = { id: string; nome: string; produtos: Produto[] };

export type Depoimento = { id: string; nome: string; texto: string; print?: Foto };

export type Dados = {
  categorias: Categoria[];
  identidade: { logo?: Foto; cores: string; tema: string; temaOutro: string };
  sobre: { texto: string; foto?: Foto };
  comercial: {
    pagamentos: string[];
    pagamentoOutro: string;
    envios: string[];
    envioOutro: string;
    taxaLocal: string;
  };
  depoimentos: Depoimento[];
  links: { whatsapp: string; instagram: string; facebook: string; shopee: string; outro: string };
  dominio: {
    consentimento: boolean;
    nomeCompleto: string;
    nascimento: string;
    cpf: string;
    cnpj: string;
    cep: string;
    endereco: string;
    telefone: string;
    email: string;
    nomeAtelie: string;
    enderecoSite: string;
  };
  canva: { email: string; naoTenho: boolean };
};

export type Status = 'nao_comecou' | 'enviando' | 'terminou' | 'em_producao' | 'entregue';

export const STATUS_LABEL: Record<Status, string> = {
  nao_comecou: 'Não começou',
  enviando: 'Enviando',
  terminou: 'Terminou',
  em_producao: 'Site em produção',
  entregue: 'Entregue',
};

export type Artesa = {
  id: string;
  nome: string;
  atelie: string;
  whatsapp: string;
  token: string;
  status: Status;
  dados: Dados;
  criado_em: string;
  terminou_em: string | null;
};

export const PAGAMENTOS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Parcelamento', 'Dinheiro'];
export const ENVIOS = ['Correios', 'Motoboy / entrega local', 'Retirada no ateliê', 'Transportadora'];
export const TEMAS = ['Floral', 'Ursinho', 'Safari', 'Delicado / romântico', 'Moderno / minimalista', 'Outro'];

export function dadosVazios(nomeAtelie = ''): Dados {
  return {
    categorias: [],
    identidade: { cores: '', tema: '', temaOutro: '' },
    sobre: { texto: '' },
    comercial: { pagamentos: [], pagamentoOutro: '', envios: [], envioOutro: '', taxaLocal: '' },
    depoimentos: [],
    links: { whatsapp: '', instagram: '', facebook: '', shopee: '', outro: '' },
    dominio: {
      consentimento: false,
      nomeCompleto: '',
      nascimento: '',
      cpf: '',
      cnpj: '',
      cep: '',
      endereco: '',
      telefone: '',
      email: '',
      nomeAtelie,
      enderecoSite: '',
    },
    canva: { email: '', naoTenho: false },
  };
}

/** Each section of the form, with whether it is complete. Used by the form and the admin panel. */
export function progresso(d: Dados) {
  const produtos = d.categorias.flatMap((c) => c.produtos);
  const secoes = [
    { id: 'categorias', nome: 'Categorias', ok: d.categorias.length > 0 && d.categorias.every((c) => c.nome.trim()) },
    {
      id: 'produtos',
      nome: 'Produtos',
      ok:
        d.categorias.length > 0 &&
        d.categorias.every((c) => c.produtos.length > 0) &&
        produtos.every((p) => p.nome.trim() && (p.valor.trim() || p.temVariacoes) && p.fotos.length >= 2),
    },
    { id: 'identidade', nome: 'Identidade visual', ok: !!d.identidade.logo && !!d.identidade.tema },
    { id: 'sobre', nome: 'Sobre o ateliê', ok: d.sobre.texto.trim().length > 0 },
    {
      id: 'comercial',
      nome: 'Pagamento e envio',
      ok:
        (d.comercial.pagamentos.length > 0 || !!d.comercial.pagamentoOutro.trim()) &&
        (d.comercial.envios.length > 0 || !!d.comercial.envioOutro.trim()),
    },
    { id: 'depoimentos', nome: 'Depoimentos (opcional)', ok: true },
    { id: 'links', nome: 'Links', ok: d.links.whatsapp.trim().length > 0 },
    {
      id: 'dominio',
      nome: 'Dados do domínio',
      ok:
        d.dominio.consentimento &&
        ['nomeCompleto', 'nascimento', 'cpf', 'cep', 'endereco', 'telefone', 'email', 'nomeAtelie', 'enderecoSite'].every(
          (k) => String(d.dominio[k as keyof Dados['dominio']]).trim(),
        ),
    },
    { id: 'canva', nome: 'Canva', ok: d.canva.naoTenho || d.canva.email.trim().length > 0 },
  ];
  const feitas = secoes.filter((s) => s.ok).length;
  return { secoes, feitas, total: secoes.length, pct: Math.round((feitas / secoes.length) * 100), produtos: produtos.length };
}
