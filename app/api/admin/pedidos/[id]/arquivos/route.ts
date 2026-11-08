import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { rota, ok, naoEncontrado, id } from '@/lib/api';
import { atualizar, buscar } from '@/lib/db';
import { apagarArquivo, caminhoSeguro, salvarFluxo } from '@/lib/arquivos';
import { CATEGORIAS_ARQUIVO, CategoriaArquivo, Pedido } from '@/lib/modelo';

/** Files Isa keeps with an order (the finished site, manuals, access details). */

type Ctx = { params: Promise<{ id: string }> };
const ARQUIVO_PAINEL_MB = 50;
const EXTENSOES = ['pdf', 'zip', 'rar', 'html', 'htm', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'mp4', 'mov'];
const doPedido = (pid: string, c: string) => caminhoSeguro(c) && c.startsWith(`painel/${pid}/`);

/** Step 1: where to send the file. */
export const POST = rota<Ctx>(async (req, ctx) => {
  const pid = await id(ctx);
  if (!(await buscar<Pedido>('pedidos', pid))) return naoEncontrado();
  const { nome, tamanho } = (await req.json()) as { nome: string; tamanho: number };
  const ext = String(nome ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSOES.includes(ext)) return NextResponse.json({ erro: `Formato não aceito. Use: ${EXTENSOES.join(', ')}.` }, { status: 400 });
  if (!(tamanho > 0) || tamanho > ARQUIVO_PAINEL_MB * 1024 * 1024) return NextResponse.json({ erro: 'Arquivo muito grande' }, { status: 413 });
  return ok({ path: `painel/${pid}/${randomUUID()}.${ext}`, url: null });
});

/** Step 2: the file itself. */
export const PUT = rota<Ctx>(async (req, ctx) => {
  const pid = await id(ctx);
  const caminho = new URL(req.url).searchParams.get('path') ?? '';
  if (!doPedido(pid, caminho)) return NextResponse.json({ erro: 'Envio inválido' }, { status: 400 });
  await salvarFluxo(caminho, req.body, ARQUIVO_PAINEL_MB * 1024 * 1024);
  return ok();
});

/** Step 3: records the file in the order. */
export const PATCH = rota<Ctx>(async (req, ctx) => {
  const pid = await id(ctx);
  const { path, nome, tamanho, categoria } = (await req.json()) as { path: string; nome: string; tamanho: number; categoria: CategoriaArquivo };
  if (!doPedido(pid, path) || !(categoria in CATEGORIAS_ARQUIVO)) return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
  const p = await atualizar<Pedido>('pedidos', pid, (p) => {
    p.arquivos.push({ path, nome: String(nome).slice(0, 200), tamanho: Number(tamanho) || 0, categoria, enviadoEm: new Date().toISOString() });
  });
  return p ? ok({ arquivos: p.arquivos }) : naoEncontrado();
});

export const DELETE = rota<Ctx>(async (req, ctx) => {
  const pid = await id(ctx);
  const caminho = new URL(req.url).searchParams.get('path') ?? '';
  if (!doPedido(pid, caminho)) return NextResponse.json({ erro: 'Arquivo inválido' }, { status: 400 });
  await apagarArquivo(caminho);
  const p = await atualizar<Pedido>('pedidos', pid, (p) => void (p.arquivos = p.arquivos.filter((a) => a.path !== caminho)));
  return p ? ok({ arquivos: p.arquivos }) : naoEncontrado();
});
