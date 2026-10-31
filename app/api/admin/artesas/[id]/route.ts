import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { atualizarArtesa, excluirArtesa, novoToken } from '@/lib/store';
import { excluirFicha } from '@/lib/agenda';
import { STATUS_LABEL, Status } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

type Corpo = {
  acao: 'status' | 'reabrir' | 'novo_link' | 'cadastro';
  status?: Status;
  nome?: string;
  atelie?: string;
  whatsapp?: string;
};

/** Actions from the admin panel: change status, reopen the form, issue a new link, or fix the sign-up details. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const { acao, status, nome, atelie, whatsapp } = (await req.json()) as Corpo;
  let r;
  if (acao === 'status' && status && status in STATUS_LABEL) r = await atualizarArtesa(id, { status });
  else if (acao === 'reabrir') r = await atualizarArtesa(id, { status: 'enviando', terminou_em: null });
  else if (acao === 'novo_link') r = await atualizarArtesa(id, { token: novoToken() });
  else if (acao === 'cadastro' && nome?.trim())
    r = await atualizarArtesa(id, { nome: nome.trim(), atelie: (atelie ?? '').trim(), whatsapp: (whatsapp ?? '').replace(/\D/g, '') });
  else return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
  if (!r) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  if (!(await excluirArtesa(id))) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 });
  await excluirFicha(id);
  return NextResponse.json({ ok: true });
}
