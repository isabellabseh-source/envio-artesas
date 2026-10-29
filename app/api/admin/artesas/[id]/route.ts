import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { atualizarArtesa, novoToken } from '@/lib/store';
import { STATUS_LABEL, Status } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

/** Actions from the admin panel: change status, reopen the form, or issue a new link. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const { acao, status } = (await req.json()) as { acao: 'status' | 'reabrir' | 'novo_link'; status?: Status };
  let r;
  if (acao === 'status' && status && status in STATUS_LABEL) r = await atualizarArtesa(id, { status });
  else if (acao === 'reabrir') r = await atualizarArtesa(id, { status: 'enviando', terminou_em: null });
  else if (acao === 'novo_link') r = await atualizarArtesa(id, { token: novoToken() });
  else return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
  if (!r) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
