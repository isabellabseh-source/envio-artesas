import { notFound } from 'next/navigation';
import { buscarPorToken } from '@/lib/store';
import Formulario from '@/components/Formulario';

export const dynamic = 'force-dynamic';

export default async function PaginaArtesa({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const artesa = await buscarPorToken(token);
  if (!artesa) notFound();
  return (
    <Formulario
      token={token}
      nome={artesa.nome}
      atelie={artesa.atelie}
      dadosIniciais={artesa.dados}
      finalizado={artesa.status !== 'nao_comecou' && artesa.status !== 'enviando'}
    />
  );
}
