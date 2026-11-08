import { rota, ok, naoEncontrado, id } from '@/lib/api';
import { atualizarCliente, excluirCliente } from '@/lib/negocio';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota<Ctx>(async (req, ctx) => ((await atualizarCliente(await id(ctx), await req.json())) ? ok() : naoEncontrado()));
export const DELETE = rota<Ctx>(async (_req, ctx) => ((await excluirCliente(await id(ctx))) ? ok() : naoEncontrado()));
