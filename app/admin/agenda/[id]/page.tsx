import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirLogin } from '@/lib/auth';
import { buscarArtesa } from '@/lib/store';
import { lerFicha } from '@/lib/agenda';
import FichaPainel from '@/components/admin/FichaPainel';

export const dynamic = 'force-dynamic';

export default async function FichaAgenda({ params }: { params: Promise<{ id: string }> }) {
  await exigirLogin();
  const id = (await params).id;
  const ficha = await lerFicha(id);
  if (!ficha) notFound();
  const artesa = ficha.artesaId ? await buscarArtesa(ficha.artesaId) : null;
  if (!ficha.nome && artesa) ficha.nome = artesa.atelie || artesa.nome;

  return (
    <div className="painel">
      <div className="linha">
        <Link href="/admin/agenda" className="botao-texto">
          ← Agenda de sites
        </Link>
        {artesa && (
          <Link href={`/admin/${artesa.id}`} className="botao-texto">
            Ver o que a artesã enviou
          </Link>
        )}
      </div>
      <header className="painel-topo">
        <h1>{ficha.nome || 'Site sem nome'}</h1>
      </header>
      <FichaPainel id={id} inicial={ficha} />
    </div>
  );
}
