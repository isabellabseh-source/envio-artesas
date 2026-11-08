import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarPainel } from '@/lib/negocio';
import { mesesComVagas } from '@/lib/agenda';
import FormPedido from '@/components/admin/FormPedido';

export default async function EditarPedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientes, linhas, vagas } = await carregarPainel();
  const l = linhas.find((x) => x.pedido.id === id);
  if (!l) notFound();
  return (
    <>
      <Link href={`/admin/pedidos/${id}`} className="botao-texto">
        ← Voltar ao pedido
      </Link>
      <header className="cabeca-pagina">
        <h1>Editar pedido de {l.cliente.atelie || l.cliente.nome}</h1>
      </header>
      <FormPedido pedido={l.pedido} clientes={clientes.map((c) => ({ id: c.id, nome: c.nome, atelie: c.atelie }))} meses={mesesComVagas(linhas, vagas, 1, 12)} />
    </>
  );
}
