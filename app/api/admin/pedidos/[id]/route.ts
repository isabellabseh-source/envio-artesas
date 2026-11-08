import { rota, ok, naoEncontrado, id } from '@/lib/api';
import { atualizarPedido, excluirPedido } from '@/lib/negocio';

type Ctx = { params: Promise<{ id: string }> };

/** Saves any order fields sent (status, dates, month, amounts, notes...). */
export const PATCH = rota<Ctx>(async (req, ctx) => {
  const p = await atualizarPedido(await id(ctx), await req.json());
  return p ? ok({ pedido: p }) : naoEncontrado();
});
export const DELETE = rota<Ctx>(async (_req, ctx) => ((await excluirPedido(await id(ctx))) ? ok() : naoEncontrado()));
