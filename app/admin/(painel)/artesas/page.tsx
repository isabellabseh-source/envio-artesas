import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { SITUACOES, dataBr, reais, saldo } from '@/lib/modelo';
import Zap from '@/components/admin/Zap';

export default async function Artesas({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { busca = '' } = await searchParams;
  const { clientes, linhas } = await carregarPainel();
  const b = busca.toLowerCase().trim();
  const lista = clientes.filter((c) => !b || `${c.nome} ${c.atelie} ${c.instagram}`.toLowerCase().includes(b));
  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>Artesãs</h1>
          <p>{clientes.length} clientes. Abra uma artesã para ver o histórico completo.</p>
        </div>
        <div className="linha">
          <a className="botao secundario" href="/api/admin/csv/artesas">
            Exportar CSV
          </a>
          <Link href="/admin/artesas/nova" className="botao">
            + Nova artesã
          </Link>
        </div>
      </header>
      <form className="filtros" method="get">
        <input type="search" name="busca" defaultValue={busca} placeholder="Buscar por nome, ateliê ou Instagram" aria-label="Buscar artesã" />
        <button className="botao secundario pequeno">Buscar</button>
      </form>
      {lista.length === 0 ? (
        <p className="vazio">{clientes.length ? 'Nenhuma artesã encontrada.' : 'Nenhuma artesã cadastrada ainda.'}</p>
      ) : (
        <div className="cartoes">
          {lista.map((c) => {
            const ps = linhas.filter((l) => l.cliente.id === c.id).map((l) => l.pedido);
            const falta = ps.reduce((t, p) => t + saldo(p), 0);
            return (
              <article key={c.id} className="cartao">
                <Link href={`/admin/artesas/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <h3>{c.atelie || c.nome}</h3>
                  <span className="discreto">
                    {c.nome}
                    {c.instagram ? ` · ${c.instagram}` : ''}
                  </span>
                </Link>
                <div className="linha">
                  {ps.length === 0 && <span className="discreto">Sem pedidos</span>}
                  {ps.map((p) => (
                    <Link key={p.id} href={`/admin/pedidos/${p.id}`} className={`etiqueta s-${p.situacao}`}>
                      {SITUACOES[p.situacao]}
                    </Link>
                  ))}
                </div>
                <div className="linha entre">
                  <Zap numero={c.whatsapp} />
                  <span className="discreto">desde {dataBr(c.contratacao)}</span>
                </div>
                {falta > 0 && <strong className="num">{reais(falta)} a receber</strong>}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
