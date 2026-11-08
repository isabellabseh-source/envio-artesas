import { notFound, redirect } from 'next/navigation';
import { buscar } from '@/lib/db';
import { Envio } from '@/lib/modelo';

/** Content pages now live inside each order. */
export default async function EnvioAntigo({ params }: { params: Promise<{ id: string }> }) {
  const e = await buscar<Envio>('envios', (await params).id);
  if (!e) notFound();
  redirect(`/admin/pedidos/${e.pedidoId}?aba=conteudo`);
}
