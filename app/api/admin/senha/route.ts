import { NextResponse } from 'next/server';
import { rota, ok } from '@/lib/api';
import { trocarSenha, usuarioAtual } from '@/lib/auth';

export const POST = rota(async (req) => {
  const u = (await usuarioAtual())!;
  const { atual, nova } = (await req.json()) as { atual: string; nova: string };
  const erro = await trocarSenha(u.id, String(atual ?? ''), String(nova ?? ''));
  return erro ? NextResponse.json({ erro }, { status: 400 }) : ok();
});
