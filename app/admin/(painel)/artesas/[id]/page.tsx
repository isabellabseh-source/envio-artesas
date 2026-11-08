import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarPainel, historicoDe } from '@/lib/negocio';
import { SITUACOES, STATUS_ENVIO, dataBr, dataHoraBr, maiuscula, mesBr, pago, reais, saldo, total } from '@/lib/modelo';
import { BotaoExcluir } from '@/components/admin/Controles';
import Zap from '@/components/admin/Zap';

export default async function PaginaArtesa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientes, linhas } = await carregarPainel();
  const c = clientes.find((x) => x.id === id);
  if (!c) notFound();
  const minhas = linhas.filter((l) => l.cliente.id === id).sort((a, b) => b.pedido.contratacao.localeCompare(a.pedido.contratacao));
  const pagamentos = minhas.flatMap((l) => l.pedido.pagamentos.map((x) => ({ ...x, servico: l.pedido.servico }))).sort((a, b) => b.data.localeCompare(a.data));
  const eventos = await historicoDe(id);
  const soma = (f: (p: (typeof minhas)[0]['pedido']) => number) => minhas.reduce((t, l) => t + f(l.pedido), 0);

  return (
    <>
      <Link href="/admin/artesas" className="botao-texto">
        ← Artesãs
      </Link>
      <header className="cabeca-pagina">
        <div>
          <h1>{c.atelie || c.nome}</h1>
          <p>{c.nome}</p>
        </div>
        <div className="linha">
          <Link href={`/admin/artesas/${c.id}/editar`} className="botao secundario">
            Editar cadastro
          </Link>
          <Link href={`/admin/pedidos/novo?artesa=${c.id}`} className="botao">
            + Novo pedido
          </Link>
        </div>
      </header>

      <div className="grade-2">
        <div className="coluna">
          <section className="cartao">
            <dl className="ficha">
              <dt>WhatsApp</dt>
              <dd>
                <Zap numero={c.whatsapp} />
              </dd>
              <dt>Instagram</dt>
              <dd>
                {c.instagram ? (
                  <a href={`https://instagram.com/${c.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer">
                    {c.instagram}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
              <dt>E-mail</dt>
              <dd>{c.email || '—'}</dd>
              <dt>Contratação</dt>
              <dd>{dataBr(c.contratacao)}</dd>
              <dt>Observações</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{c.obs || '—'}</dd>
            </dl>
            <div className="indicadores">
              <div className="ind dinheiro">
                <strong>{reais(soma(total))}</strong>
                <span>contratado</span>
              </div>
              <div className="ind dinheiro verde">
                <strong>{reais(soma(pago))}</strong>
                <span>pago</span>
              </div>
              <div className={`ind dinheiro ${soma(saldo) > 0 ? 'alerta' : ''}`}>
                <strong>{reais(soma(saldo))}</strong>
                <span>a receber</span>
              </div>
            </div>
          </section>

          <section className="cartao">
            <h2>Pedidos</h2>
            {minhas.length === 0 ? (
              <p className="discreto">
                Nenhum pedido ainda. <Link href={`/admin/pedidos/novo?artesa=${c.id}`}>Cadastrar o primeiro</Link>.
              </p>
            ) : (
              <ul className="lista-mes">
                {minhas.map(({ pedido: p, envio: e }) => (
                  <li key={p.id}>
                    <Link href={`/admin/pedidos/${p.id}`}>
                      <b>{p.servico || 'Serviço não definido'}</b>
                      <br />
                      <span className="discreto">
                        {p.mes ? maiuscula(mesBr(p.mes)) : 'Sem mês'} · entrega {p.entrega ? `feita em ${dataBr(p.entrega)}` : `prevista ${dataBr(p.fim)}`} ·{' '}
                        {reais(total(p))}, falta {reais(saldo(p))}
                        {e ? ` · conteúdo ${STATUS_ENVIO[e.status].toLowerCase()} (${e.pct}%)` : ''}
                      </span>
                    </Link>
                    <span className={`etiqueta s-${p.situacao}`}>{SITUACOES[p.situacao]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cartao">
            <h2>Pagamentos</h2>
            {pagamentos.length === 0 ? (
              <p className="discreto">Nenhum pagamento registrado.</p>
            ) : (
              <div className="tabela-rolagem">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Serviço</th>
                      <th>Forma</th>
                      <th className="valor">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.map((x) => (
                      <tr key={x.id}>
                        <td className="num">{dataBr(x.data)}</td>
                        <td className="quebra">{x.servico}</td>
                        <td>{x.forma}</td>
                        <td className="valor">{reais(x.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <BotaoExcluir
            url={`/api/admin/clientes/${c.id}`}
            rotulo="Excluir artesã"
            pergunta={`Excluir ${c.atelie || c.nome}?`}
            explicacao="O cadastro e todos os pedidos, pagamentos e conteúdos dela vão para a lixeira (em Configurações) e podem ser recuperados por 30 dias."
            depois="/admin/artesas"
          />
        </div>

        <section className="cartao cartao-costurado">
          <h2>Histórico</h2>
          {eventos.length === 0 ? (
            <p className="discreto">Nada registrado ainda.</p>
          ) : (
            <ul className="historico">
              {eventos.map((e) => (
                <li key={e.id}>
                  <b className="num">{dataHoraBr(e.data).slice(0, 10)}</b> · {e.texto}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
