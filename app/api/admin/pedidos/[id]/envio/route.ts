import { rota, ok, id } from '@/lib/api';
import { criarLinkEnvio } from '@/lib/negocio';

type Ctx = { params: Promise<{ id: string }> };

/** Creates the content link for an order that has none (orders brought from the old agenda). */
export const POST = rota<Ctx>(async (_req, ctx) => {
  await criarLinkEnvio(await id(ctx));
  return ok();
});
