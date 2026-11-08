import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { hoje } from '@/lib/modelo';
import TabelaPedidos, { Filtros } from '@/components/admin/TabelaPedidos';

export default async function Pedidos({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const { linhas, clientes } = await carregarPainel();
  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>Pedidos</h1>
          <p>
            {linhas.length} pedidos de {clientes.length} artesãs. Mude a situação direto na tabela.
          </p>
        </div>
        <Link href="/admin/pedidos/novo" className="botao">
          + Novo pedido
        </Link>
      </header>
      <TabelaPedidos
        hj={hoje()}
        iniciais={filtros}
        linhas={linhas.map((l) => ({
          pedido: l.pedido,
          cliente: { id: l.cliente.id, nome: l.cliente.nome, atelie: l.cliente.atelie, whatsapp: l.cliente.whatsapp },
          envio: l.envio ? { status: l.envio.status, pct: l.envio.pct } : null,
        }))}
      />
    </>
  );
}
