import { notFound } from 'next/navigation';
import { buscar } from '@/lib/db';
import { envioPorToken } from '@/lib/store';
import { Cliente } from '@/lib/modelo';
import Formulario from '@/components/Formulario';

export const dynamic = 'force-dynamic';

export default async function PaginaArtesa({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const envio = await envioPorToken(token);
  if (!envio) notFound();
  const cliente = await buscar<Cliente>('clientes', envio.clienteId);
  return (
    <Formulario
      token={token}
      nome={cliente?.nome ?? ''}
      atelie={cliente?.atelie ?? ''}
      dadosIniciais={envio.dados}
      finalizado={envio.status === 'terminou'}
    />
  );
}
