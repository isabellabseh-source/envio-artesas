import { rota, ok } from '@/lib/api';
import { EntradaCliente, EntradaPedido, criarCliente, criarPedido } from '@/lib/negocio';

/** New order; with `novoCliente` it also registers the artisan in the same step. */
export const POST = rota(async (req) => {
  const corpo = (await req.json()) as EntradaPedido & { novoCliente?: EntradaCliente };
  if (corpo.novoCliente) corpo.clienteId = (await criarCliente(corpo.novoCliente)).id;
  const p = await criarPedido(corpo);
  return ok({ id: p.id });
});
