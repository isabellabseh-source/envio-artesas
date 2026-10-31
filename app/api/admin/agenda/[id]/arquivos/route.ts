import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { apagarArquivoPainel, atualizarFicha, caminhoPainelValido, lerFicha, novoArquivoPainel, salvarArquivoPainelLocal } from '@/lib/agenda';
import { ARQUIVO_PAINEL_MB, CATEGORIAS_ARQUIVO, CategoriaArquivo, EXTENSOES_PAINEL } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

async function liberado(ctx: Ctx) {
  if (!(await estaLogada())) return { erro: NextResponse.json({ erro: 'Não autorizado' }, { status: 401 }) };
  const { id } = await ctx.params;
  if (!(await lerFicha(id))) return { erro: NextResponse.json({ erro: 'Não encontrado' }, { status: 404 }) };
  return { id };
}

const daArtesa = (id: string, caminho: string) => caminhoPainelValido(caminho) && caminho.startsWith(`painel/${id}/`);

/** Step 1: prepares where the browser sends the file. */
export async function POST(req: Request, ctx: Ctx) {
  const { id, erro } = await liberado(ctx);
  if (erro) return erro;
  const { nome, tamanho } = (await req.json()) as { nome: string; tamanho: number };
  const ext = String(nome ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSOES_PAINEL.includes(ext)) return NextResponse.json({ erro: 'Formato não aceito' }, { status: 400 });
  if (!(tamanho > 0) || tamanho > ARQUIVO_PAINEL_MB * 1024 * 1024) return NextResponse.json({ erro: 'Arquivo muito grande' }, { status: 413 });
  return NextResponse.json(await novoArquivoPainel(id!, ext));
}

/** Local mode only: receives the file itself. */
export async function PUT(req: Request, ctx: Ctx) {
  const { id, erro } = await liberado(ctx);
  if (erro) return erro;
  const caminho = new URL(req.url).searchParams.get('path') ?? '';
  if (process.env.SUPABASE_URL || !daArtesa(id!, caminho)) return NextResponse.json({ erro: 'Envio inválido' }, { status: 400 });
  await salvarArquivoPainelLocal(caminho, Buffer.from(await req.arrayBuffer()));
  return NextResponse.json({ ok: true });
}

/** Step 2: after the upload, records the file in the agenda entry. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, erro } = await liberado(ctx);
  if (erro) return erro;
  const { path, nome, tamanho, categoria } = (await req.json()) as { path: string; nome: string; tamanho: number; categoria: CategoriaArquivo };
  if (!daArtesa(id!, path) || !(categoria in CATEGORIAS_ARQUIVO)) return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
  const ficha = await atualizarFicha(id!, (f) => {
    f.arquivos.push({ path, nome: String(nome).slice(0, 200), tamanho: Number(tamanho) || 0, categoria, enviadoEm: new Date().toISOString() });
  });
  return NextResponse.json(ficha);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id, erro } = await liberado(ctx);
  if (erro) return erro;
  const caminho = new URL(req.url).searchParams.get('path') ?? '';
  if (!daArtesa(id!, caminho)) return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
  await apagarArquivoPainel(caminho);
  const ficha = await atualizarFicha(id!, (f) => void (f.arquivos = f.arquivos.filter((a) => a.path !== caminho)));
  return NextResponse.json(ficha);
}
