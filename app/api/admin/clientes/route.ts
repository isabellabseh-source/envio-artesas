import { rota, ok } from '@/lib/api';
import { criarCliente } from '@/lib/negocio';

export const POST = rota(async (req) => ok({ id: (await criarCliente(await req.json())).id }));
