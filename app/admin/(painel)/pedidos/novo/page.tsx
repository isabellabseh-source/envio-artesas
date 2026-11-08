import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { mesesComVagas } from '@/lib/agenda';
import FormPedido from '@/components/admin/FormPedido';

export default async function NovoPedido({ searchParams }: { searchParams: Promise<{ artesa?: string }> }) {
  const { artesa } = await searchParams;
  const { clientes, linhas, vagas } = await carregarPainel();
  return (
    <>
      <Link href="/admin/pedidos" className="botao-texto">
        ← Pedidos
      </Link>
      <header className="cabeca-pagina">
        <div>
          <h1>Novo pedido</h1>
          <p>Ao cadastrar, o pedido já ocupa a vaga do mês e ganha um link de envio de conteúdo.</p>
        </div>
      </header>
      <FormPedido
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome, atelie: c.atelie }))}
        meses={mesesComVagas(linhas, vagas, 0, 12)}
        clienteInicial={artesa}
      />
    </>
  );
}
