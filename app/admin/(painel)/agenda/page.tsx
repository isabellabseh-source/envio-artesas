import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { mesesComVagas } from '@/lib/agenda';
import { SITUACOES, dataBr, hoje, maiuscula, mesBr, nomeMes, somarMeses, vagasDoMes } from '@/lib/modelo';
import Reagendar from '@/components/admin/Reagendar';

export default async function Agenda({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const hj = hoje();
  const pedido = (await searchParams).mes;
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : hj.slice(0, 7);
  const { linhas, vagas } = await carregarPainel();
  const [ano, m] = mes.split('-').map(Number);
  const dias = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const primeiroDia = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const doMes = linhas.filter((l) => l.pedido.mes === mes).sort((a, b) => (a.pedido.inicio || '9').localeCompare(b.pedido.inicio || '9'));
  const total = vagasDoMes(vagas, mes);
  const livres = total - doMes.length;
  const semMes = linhas.filter((l) => !l.pedido.mes && l.pedido.situacao !== 'entregue');
  const opcoes = mesesComVagas(linhas, vagas, 1, 12);

  const celulas: React.ReactNode[] = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(<div key={`v${i}`} className="dia fora" />);
  for (let d = 1; d <= dias; d++) {
    const ymd = `${mes}-${String(d).padStart(2, '0')}`;
    const aqui = linhas.filter(({ pedido: p }) => p.inicio && p.inicio <= ymd && ymd <= (p.entrega || p.fim || p.inicio));
    celulas.push(
      <div key={ymd} className={`dia ${ymd === hj ? 'hoje' : ''}`}>
        <b>{d}</b>
        {aqui.slice(0, 3).map(({ pedido: p, cliente: c }) => (
          <Link
            key={p.id}
            href={`/admin/pedidos/${p.id}`}
            className={`chip-agenda s-${p.situacao} ${p.inicio === ymd ? 'inicio' : ''} ${(p.entrega || p.fim) === ymd ? 'fim' : ''}`}
            title={`${c.atelie || c.nome} · ${p.servico} · ${SITUACOES[p.situacao]}`}
          >
            {c.atelie || c.nome}
          </Link>
        ))}
        {aqui.length > 3 && <span className="discreto" style={{ fontSize: '0.7rem' }}>+{aqui.length - 3}</span>}
      </div>,
    );
  }

  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>Agenda de produção</h1>
          <p>Cada pedido ocupa uma vaga no mês agendado, mesmo pausado ou sem conteúdo.</p>
        </div>
        <Link href="/admin/configuracoes" className="botao secundario pequeno">
          Definir vagas por mês
        </Link>
      </header>
      <div className="grade-2">
        <section className="cartao">
          <div className="agenda-topo">
            <Link className="botao secundario pequeno" aria-label="Mês anterior" href={`/admin/agenda?mes=${somarMeses(mes, -1)}`}>
              ‹
            </Link>
            <h2>{maiuscula(mesBr(mes))}</h2>
            <Link className="botao secundario pequeno" aria-label="Próximo mês" href={`/admin/agenda?mes=${somarMeses(mes, 1)}`}>
              ›
            </Link>
            {mes !== hj.slice(0, 7) && (
              <Link className="botao-texto" href="/admin/agenda">
                Hoje
              </Link>
            )}
          </div>
          <div className="indicadores">
            <div className="ind">
              <strong>{total}</strong>
              <span>vagas no mês</span>
            </div>
            <div className="ind azul">
              <strong>{doMes.length}</strong>
              <span>vagas ocupadas</span>
            </div>
            <div className={`ind ${livres <= 0 ? 'alerta' : 'verde'}`}>
              <strong>{Math.max(0, livres)}</strong>
              <span>{livres <= 0 ? 'mês lotado' : 'vagas disponíveis'}</span>
            </div>
          </div>
          <div className="tabela-rolagem">
            <div className="calendario">
              {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
                <div key={d} className="dia-semana">
                  {d}
                </div>
              ))}
              {celulas}
            </div>
          </div>
          <p className="discreto">Cada faixa vai do início previsto até a entrega. Toque num pedido para abrir.</p>
        </section>

        <div className="coluna">
          <section className="cartao cartao-costurado">
            <h2>
              Pedidos de {nomeMes(m)} <span className="discreto">· {doMes.length}</span>
            </h2>
            {doMes.length === 0 ? (
              <p className="vazio">Nenhum pedido neste mês.</p>
            ) : (
              <ul className="lista-mes">
                {doMes.map(({ pedido: p, cliente: c }) => (
                  <li key={p.id}>
                    <Link href={`/admin/pedidos/${p.id}`}>
                      <b>{c.atelie || c.nome}</b>
                      <br />
                      <span className="discreto">
                        {p.servico || 'Serviço'} · {dataBr(p.inicio)} a {dataBr(p.fim)}
                      </span>
                    </Link>
                    <span className={`etiqueta s-${p.situacao}`}>{SITUACOES[p.situacao]}</span>
                    <div className="acoes">
                      <Reagendar pedidoId={p.id} mes={p.mes} inicio={p.inicio} fim={p.fim} meses={opcoes} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {semMes.length > 0 && (
            <section className="cartao">
              <h2>Sem mês definido</h2>
              <p className="discreto">Estes pedidos ainda não ocupam vaga. Escolha o mês de cada um.</p>
              <ul className="lista-mes">
                {semMes.map(({ pedido: p, cliente: c }) => (
                  <li key={p.id}>
                    <Link href={`/admin/pedidos/${p.id}`}>
                      <b>{c.atelie || c.nome}</b>
                    </Link>
                    <span className={`etiqueta s-${p.situacao}`}>{SITUACOES[p.situacao]}</span>
                    <div className="acoes">
                      <Reagendar pedidoId={p.id} mes="" inicio={p.inicio} fim={p.fim} meses={opcoes} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
