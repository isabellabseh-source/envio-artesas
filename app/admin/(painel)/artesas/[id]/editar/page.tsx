import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buscar } from '@/lib/db';
import { Cliente } from '@/lib/modelo';
import FormCliente from '@/components/admin/FormCliente';

export default async function EditarArtesa({ params }: { params: Promise<{ id: string }> }) {
  const c = await buscar<Cliente>('clientes', (await params).id);
  if (!c || c.excluidoEm) notFound();
  return (
    <>
      <Link href={`/admin/artesas/${c.id}`} className="botao-texto">
        ← Voltar
      </Link>
      <header className="cabeca-pagina">
        <h1>Editar cadastro</h1>
      </header>
      <FormCliente cliente={c} />
    </>
  );
}
