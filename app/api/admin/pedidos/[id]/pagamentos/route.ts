import { rota, ok, naoEncontrado, id } from '@/lib/api';
import { registrarPagamento, removerPagamento } from '@/lib/negocio';

type Ctx = { params: Promise<{ id: string }> };

export const POST = rota<Ctx>(async (req, ctx) => {
  const p = await registrarPagamento(await id(ctx), await req.json());
  return p ? ok({ pedido: p }) : naoEncontrado();
});
export const DELETE = rota<Ctx>(async (req, ctx) => {
  const p = await removerPagamento(await id(ctx), new URL(req.url).searchParams.get('pagamento') ?? '');
  return p ? ok({ pedido: p }) : naoEncontrado();
});
