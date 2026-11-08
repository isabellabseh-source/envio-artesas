import 'server-only';
import { NextResponse } from 'next/server';
import { usuarioAtual } from './auth';
import { Erro } from './negocio';

/** Wraps an admin API handler: requires login and turns known errors into friendly messages. */
export function rota<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    if (!(await usuarioAtual())) return NextResponse.json({ erro: 'Entre no painel de novo.' }, { status: 401 });
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof Erro) return NextResponse.json({ erro: e.message }, { status: 400 });
      console.error(e);
      return NextResponse.json({ erro: 'Não deu certo. Tente de novo.' }, { status: 500 });
    }
  };
}

export const ok = (dados: object = { ok: true }) => NextResponse.json(dados);
export const naoEncontrado = () => NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
export const id = async (ctx: { params: Promise<{ id: string }> }) => (await ctx.params).id;
