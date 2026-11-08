import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buscar } from '@/lib/db';
import { carregarPainel, historicoDe } from '@/lib/negocio';
import { enderecoBase } from '@/lib/endereco';
import { linkArtesa, linkWhatsApp } from '@/lib/links';
import { Envio, SITUACOES_FIN, STATUS_ENVIO, atrasado, dataBr, dataHoraBr, hoje, maiuscula, mesBr, pago, reais, saldo, situacaoFin, total } from '@/lib/modelo';
import { SeletorSituacao, BotaoCopiar, BotaoExcluir, CriarLink } from '@/components/admin/Controles';
import Zap from '@/components/admin/Zap';
import Pagamentos from '@/components/admin/Pagamentos';
import AcoesEnvio from '@/components/admin/AcoesEnvio';
import Observacoes from '@/components/admin/Observacoes';
import ArquivosEntregues from '@/components/admin/ArquivosEntregues';
import BaixarZip from '@/components/admin/BaixarZip';
import ConteudoEnviado from '@/components/admin/ConteudoEnviado';

const ABAS = [
  ['resumo', 'Resumo'],
  ['financeiro', 'Financeiro'],
  ['conteudo', 'Conteúdo'],
  ['arquivos', 'Arquivos do site'],
] as const;

export default async function PaginaPedido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { id } = await params;
  const aba = (await searchParams).aba ?? 'resumo';
  const { linhas } = await carregarPainel();
  const l = linhas.find((x) => x.pedido.id === id);
  if (!l) notFound();
  const { pedido: p, cliente: c } = l;
  const envio = await buscar<Envio>('envios', p.envioId);
  const base = await enderecoBase();
  const hj = hoje();
  const fin = situacaoFin(p);

  return (
    <>
      <Link href="/admin/pedidos" className="botao-texto">
        ← Pedidos
      </Link>
      <header className="cabeca-pagina">
        <div>
          <h1>{c.atelie || c.nome}</h1>
          <p>
            <Link href={`/admin/artesas/${c.id}`}>{c.nome}</Link> · <Zap numero={c.whatsapp} /> · {p.servico || 'serviço não definido'}
          </p>
        </div>
        <div className="linha">
          <SeletorSituacao pedidoId={p.id} situacao={p.situacao} />
          <span className={`etiqueta f-${fin}`}>{SITUACOES_FIN[fin]}</span>
        </div>
      </header>

      <nav className="abas-painel" aria-label="Partes do pedido">
        {ABAS.map(([k, t]) => (
          <Link key={k} href={`/admin/pedidos/${p.id}?aba=${k}`} className={aba === k ? 'ativa' : ''} aria-current={aba === k ? 'page' : undefined}>
            {t}
            {k === 'conteudo' && l.envio ? ` · ${l.envio.pct}%` : ''}
          </Link>
        ))}
      </nav>

      {aba === 'resumo' && (
        <div className="grade-2">
          <div className="coluna">
            <section className="cartao">
              <div className="cabeca-cartao">
                <h2>Pedido</h2>
                <Link href={`/admin/pedidos/${p.id}/editar`} className="botao secundario pequeno">
                  Editar pedido
                </Link>
              </div>
              <dl className="ficha">
                <dt>Tipo de site</dt>
                <dd>{p.tipoSite || '—'}</dd>
                <dt>Serviço</dt>
                <dd>{p.servico || '—'}</dd>
                <dt>Adicionais</dt>
                <dd>{p.adicionais.length ? p.adicionais.join(', ') : 'Nenhum'}</dd>
                <dt>Contratação</dt>
                <dd>{dataBr(p.contratacao)}</dd>
                <dt>Mês agendado</dt>
                <dd>{p.mes ? <Link href={`/admin/agenda?mes=${p.mes}`}>{maiuscula(mesBr(p.mes))}</Link> : 'Sem mês definido'}</dd>
                <dt>Início previsto</dt>
                <dd>{dataBr(p.inicio)}</dd>
                <dt>Entrega prevista</dt>
                <dd className={atrasado(p, hj) ? 'atrasado-txt' : ''}>
                  {dataBr(p.fim)}
                  {atrasado(p, hj) ? ' · atrasado' : ''}
                </dd>
                <dt>Entrega efetiva</dt>
                <dd>{dataBr(p.entrega)}</dd>
                <dt>Endereço do site</dt>
                <dd>{p.enderecoSite || '—'}</dd>
                <dt>Renovação do domínio</dt>
                <dd>{dataBr(p.renovacaoDominio)}</dd>
                <dt>Valor</dt>
                <dd>
                  {reais(total(p))} · pago {reais(pago(p))} · <strong>falta {reais(saldo(p))}</strong>
                </dd>
              </dl>
            </section>
            <section className="cartao">
              <Observacoes url={`/api/admin/pedidos/${p.id}`} campo="obs" inicial={p.obs} rotulo="Observações, pendências e pedidos da cliente" />
            </section>
            <BotaoExcluir
              url={`/api/admin/pedidos/${p.id}`}
              rotulo="Excluir pedido"
              pergunta={`Excluir o pedido de ${c.atelie || c.nome}?`}
              explicacao="O pedido, os pagamentos e o conteúdo enviado vão para a lixeira (em Configurações) e podem ser recuperados por 30 dias."
              depois="/admin/pedidos"
            />
          </div>
          <section className="cartao cartao-costurado">
            <h2>Histórico do pedido</h2>
            <Historico clienteId={c.id} pedidoId={p.id} />
          </section>
        </div>
      )}

      {aba === 'financeiro' && (
        <section className="cartao">
          <div className="indicadores">
            <div className="ind dinheiro">
              <strong>{reais(total(p))}</strong>
              <span>total contratado</span>
            </div>
            <div className="ind dinheiro verde">
              <strong>{reais(pago(p))}</strong>
              <span>já pago</span>
            </div>
            <div className={`ind dinheiro ${saldo(p) > 0 ? 'alerta' : 'verde'}`}>
              <strong>{reais(saldo(p))}</strong>
              <span>falta receber</span>
            </div>
          </div>
          <dl className="ficha">
            <dt>Serviço principal</dt>
            <dd className="num">{reais(p.valorServico)}</dd>
            <dt>Serviços adicionais</dt>
            <dd className="num">
              {reais(p.valorAdicionais)}
              {p.adicionais.length ? ` (${p.adicionais.join(', ')})` : ''}
            </dd>
            <dt>Situação</dt>
            <dd>
              <span className={`etiqueta f-${fin}`}>{SITUACOES_FIN[fin]}</span>
            </dd>
            <dt>Restante previsto para</dt>
            <dd>{dataBr(p.saldoPrevisto)}</dd>
            <dt>Observações</dt>
            <dd>{p.obsFinanceiras || '—'}</dd>
          </dl>
          <Pagamentos pedidoId={p.id} pagamentos={p.pagamentos} saldo={saldo(p)} />
          <p className="discreto">
            Para mudar os valores contratados ou a previsão do restante, use <Link href={`/admin/pedidos/${p.id}/editar`}>Editar pedido</Link>.
          </p>
        </section>
      )}

      {aba === 'conteudo' && !envio && (
        <section className="cartao cartao-costurado">
          <h2>Sem link de envio</h2>
          <p>Este pedido ainda não tem link para a artesã mandar o conteúdo.</p>
          <CriarLink pedidoId={p.id} />
        </section>
      )}

      {aba === 'conteudo' && envio && l.envio && (
        <>
          <div className="grade-2">
            <section className="cartao">
              <div className="cabeca-cartao">
                <h2>Checklist de conteúdo</h2>
                <span className={`etiqueta e-${envio.status}`}>{STATUS_ENVIO[envio.status]}</span>
              </div>
              <div className="linha">
                <span className="barra grossa" style={{ flex: 1 }}>
                  <span className="barra-cheia" style={{ width: `${l.envio.pct}%` }} />
                </span>
                <strong className="num">{l.envio.pct}%</strong>
              </div>
              <ul className="lista-checagem">
                {l.envio.itens.map((i) => (
                  <li key={i.nome} className={i.ok ? 'ok' : 'pendente'}>
                    <span className="bolinha">{i.ok ? '✓' : ''}</span>
                    {i.nome}
                    {i.opcional ? ' (opcional)' : ''}
                  </li>
                ))}
              </ul>
              <p className="discreto">
                {envio.status === 'terminou'
                  ? `Ela apertou “Terminei” em ${dataHoraBr(envio.terminouEm)}.`
                  : envio.ultimoEnvioEm
                    ? `Preenchendo · último envio em ${dataHoraBr(envio.ultimoEnvioEm)}.`
                    : 'Ela ainda não abriu o link.'}{' '}
                {l.envio.produtos} produtos cadastrados.
              </p>
            </section>
            <section className="cartao cartao-costurado">
              <h2>Link da artesã</h2>
              <code className="link-copiar">{linkArtesa(base, envio.token)}</code>
              <div className="linha">
                <BotaoCopiar texto={linkArtesa(base, envio.token)} />
                <a className="botao azul pequeno" href={linkWhatsApp(base, { nome: c.nome, whatsapp: c.whatsapp, token: envio.token })} target="_blank" rel="noreferrer">
                  Enviar no WhatsApp
                </a>
              </div>
              <AcoesEnvio envioId={envio.id} status={envio.status} podeLiberar={p.situacao === 'entregue' || p.situacao === 'finalizado'} liberado={!!envio.arquivosLiberadosEm} />
              {envio.status !== 'nao_comecou' && (
                <div className="linha">
                  <a className="botao pequeno" href={`/api/admin/envios/${envio.id}/pdf`}>
                    Baixar PDF
                  </a>
                  {!envio.arquivosLiberadosEm && <BaixarZip id={envio.id} />}
                </div>
              )}
              {envio.arquivosLiberadosEm && (
                <p className="discreto">Fotos e vídeos apagados da hospedagem em {dataHoraBr(envio.arquivosLiberadosEm)} para liberar espaço.</p>
              )}
            </section>
          </div>
          {envio.status !== 'nao_comecou' && <ConteudoEnviado d={envio.dados} />}
        </>
      )}

      {aba === 'arquivos' && (
        <section className="cartao">
          <h2>Arquivos do site</h2>
          <p className="discreto">Guarde aqui o site pronto, manuais e acessos entregues à artesã (até 50 MB por arquivo).</p>
          <ArquivosEntregues id={p.id} arquivos={p.arquivos} />
        </section>
      )}
    </>
  );
}

async function Historico({ clienteId, pedidoId }: { clienteId: string; pedidoId: string }) {
  const eventos = (await historicoDe(clienteId)).filter((e) => e.pedidoId === pedidoId);
  if (!eventos.length) return <p className="discreto">Nada registrado ainda.</p>;
  return (
    <ul className="historico">
      {eventos.map((e) => (
        <li key={e.id}>
          <b className="num">{dataHoraBr(e.data).slice(0, 10)}</b> · {e.texto}
        </li>
      ))}
    </ul>
  );
}
