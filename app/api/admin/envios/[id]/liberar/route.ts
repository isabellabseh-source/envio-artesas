import { rota, ok, naoEncontrado, id } from '@/lib/api';
import { atualizar } from '@/lib/db';
import { apagarPasta, usoPasta } from '@/lib/arquivos';
import { registrar } from '@/lib/negocio';
import { Envio, Pedido } from '@/lib/modelo';
import { buscar } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Frees the space taken by an artisan's photos, videos and PDFs after her site is delivered.
 * Only for delivered or finished orders; texts, prices and history stay in the panel.
 */
export const POST = rota<Ctx>(async (_req, ctx) => {
  const eid = await id(ctx);
  const e = await buscar<Envio>('envios', eid);
  if (!e) return naoEncontrado();
  const p = await buscar<Pedido>('pedidos', e.pedidoId);
  if (!p || (p.situacao !== 'entregue' && p.situacao !== 'finalizado')) {
    return Response.json({ erro: 'Só dá para liberar o espaço de sites finalizados ou entregues.' }, { status: 400 });
  }
  const { bytes } = await usoPasta(eid);
  await apagarPasta(eid);
  await atualizar<Envio>('envios', eid, (x) => void (x.arquivosLiberadosEm = new Date().toISOString()));
  await registrar(e.clienteId, `Fotos e vídeos apagados da hospedagem para liberar espaço (${Math.round(bytes / 1024 / 1024)} MB)`, e.pedidoId);
  return ok({ bytes });
});
