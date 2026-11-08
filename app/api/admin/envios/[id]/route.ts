import { NextResponse } from 'next/server';
import { rota, ok, naoEncontrado, id } from '@/lib/api';
import { gerarNovoLink, reabrirEnvio } from '@/lib/negocio';

type Ctx = { params: Promise<{ id: string }> };

/** Reopens the artisan's form, or replaces her link (the old one stops working). */
export const PATCH = rota<Ctx>(async (req, ctx) => {
  const { acao } = (await req.json()) as { acao: string };
  const eid = await id(ctx);
  const e = acao === 'reabrir' ? await reabrirEnvio(eid) : acao === 'novo_link' ? await gerarNovoLink(eid) : undefined;
  if (e === undefined) return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
  return e ? ok({ token: e.token }) : naoEncontrado();
});
