import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { SERVICOS, SITUACOES_FIN, dataBr, hoje, maiuscula, mesBr, nomeMes, pago, reais, saldo, situacaoFin, total } from '@/lib/modelo';
import { FiltroAuto } from '@/components/admin/Controles';

type Filtros = { cliente?: string; mes?: string; servico?: string; situacao?: string };

export default async function Financeiro({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const { linhas, clientes } = await carregarPainel();
  const doFiltro = linhas.filter(
    ({ pedido: p, cliente: c }) =>
      (!f.cliente || c.id === f.cliente) &&
      (!f.servico || p.servico === f.servico) &&
      (!f.situacao || (f.situacao === 'pendente' ? situacaoFin(p) !== 'pago' : situacaoFin(p) === f.situacao)),
  );
  const pedidos = doFiltro.map((l) => l.pedido);
  const mesRef = f.mes || hoje().slice(0, 7);
  // Received money counts on the date of each payment, so nothing is counted twice.
  const pagamentos = doFiltro
    .flatMap(({ pedido: p, cliente: c }) => p.pagamentos.map((x) => ({ x, p, c })))
    .filter(({ x }) => !f.mes || x.data.startsWith(f.mes))
    .sort((a, b) => b.x.data.localeCompare(a.x.data));
  const vendido = pedidos.reduce((t, p) => t + total(p), 0);
  const recebido = pedidos.reduce((t, p) => t + pago(p), 0);
  const recebidoMes = doFiltro.flatMap((l) => l.pedido.pagamentos).filter((x) => x.data.startsWith(mesRef)).reduce((t, x) => t + x.valor, 0);
  const previstos = doFiltro
    .filter(({ pedido: p }) => saldo(p) > 0)
    .sort((a, b) => (a.pedido.saldoPrevisto || '9').localeCompare(b.pedido.saldoPrevisto || '9'));
  const mesesPag = [...new Set(linhas.flatMap((l) => l.pedido.pagamentos.map((x) => x.data.slice(0, 7))))].sort().reverse();
  if (!mesesPag.includes(hoje().slice(0, 7))) mesesPag.unshift(hoje().slice(0, 7));

  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>Financeiro</h1>
          <p>Recebimentos contados pela data de cada pagamento.</p>
        </div>
        <div className="linha">
          <a className="botao secundario pequeno" href="/api/admin/csv/pagamentos">
            Pagamentos em CSV
          </a>
          <a className="botao secundario pequeno" href="/api/admin/csv/pedidos">
            Pedidos em CSV
          </a>
        </div>
      </header>
      <section className="cartao">
        <FiltroAuto>
          <select name="cliente" defaultValue={f.cliente ?? ''} aria-label="Artesã">
            <option value="">Todas as artesãs</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.atelie || c.nome}
              </option>
            ))}
          </select>
          <select name="mes" defaultValue={f.mes ?? ''} aria-label="Mês">
            <option value="">Todos os meses</option>
            {mesesPag.map((m) => (
              <option key={m} value={m}>
                {maiuscula(mesBr(m))}
              </option>
            ))}
          </select>
          <select name="servico" defaultValue={f.servico ?? ''} aria-label="Serviço">
            <option value="">Todos os serviços</option>
            {SERVICOS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select name="situacao" defaultValue={f.situacao ?? ''} aria-label="Situação financeira">
            <option value="">Todas as situações</option>
            <option value="pendente">Com saldo a receber</option>
            {Object.entries(SITUACOES_FIN).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
          {(f.cliente || f.mes || f.servico || f.situacao) && (
            <Link href="/admin/financeiro" className="botao-texto">
              Limpar filtros
            </Link>
          )}
        </FiltroAuto>
        <div className="indicadores">
          <div className="ind dinheiro">
            <strong>{reais(vendido)}</strong>
            <span>total vendido</span>
          </div>
          <div className="ind dinheiro verde">
            <strong>{reais(recebido)}</strong>
            <span>total recebido</span>
          </div>
          <div className="ind dinheiro">
            <strong>{reais(vendido - recebido)}</strong>
            <span>total pendente</span>
          </div>
          <div className="ind dinheiro azul">
            <strong>{reais(recebidoMes)}</strong>
            <span>recebido em {nomeMes(Number(mesRef.slice(5)))}</span>
          </div>
        </div>
      </section>
      <div className="grade-2">
        <section className="cartao">
          <h2>Histórico de pagamentos</h2>
          {pagamentos.length === 0 ? (
            <p className="vazio">Nenhum pagamento com esses filtros.</p>
          ) : (
            <div className="tabela-rolagem">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Artesã</th>
                    <th>Forma</th>
                    <th className="valor">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map(({ x, p, c }) => (
                    <tr key={x.id}>
                      <td className="num">{dataBr(x.data)}</td>
                      <td className="nome-cel">
                        <Link href={`/admin/pedidos/${p.id}?aba=financeiro`}>
                          <strong>{c.atelie || c.nome}</strong>
                          <span>{p.servico}</span>
                        </Link>
                      </td>
                      <td>{x.forma || '—'}</td>
                      <td className="valor">{reais(x.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="cartao cartao-costurado">
          <h2>Pagamentos previstos</h2>
          {previstos.length === 0 ? (
            <p className="vazio">Nada a receber ♡</p>
          ) : (
            <ul className="lista-mes">
              {previstos.map(({ pedido: p, cliente: c }) => (
                <li key={p.id}>
                  <Link href={`/admin/pedidos/${p.id}?aba=financeiro`}>
                    <b>{c.atelie || c.nome}</b>
                    <br />
                    <span className="discreto">{p.saldoPrevisto ? `previsto para ${dataBr(p.saldoPrevisto)}` : 'sem data prevista'}</span>
                  </Link>
                  <b className="num">{reais(saldo(p))}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
