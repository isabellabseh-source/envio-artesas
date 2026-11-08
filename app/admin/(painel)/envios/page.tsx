import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { enderecoBase } from '@/lib/endereco';
import { linkArtesa, linkWhatsApp } from '@/lib/links';
import { STATUS_ENVIO, dataHoraBr } from '@/lib/modelo';
import { BotaoCopiar } from '@/components/admin/Controles';

export default async function Envios({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const ver = (await searchParams).ver ?? 'abertos';
  const { linhas } = await carregarPainel();
  const base = await enderecoBase();
  const ordem = { enviando: 0, nao_comecou: 1, terminou: 2 } as const;
  const todos = linhas.filter((l) => l.envio);
  const lista = todos
    .filter((l) => (ver === 'todos' ? true : ver === 'completos' ? l.envio!.status === 'terminou' : l.envio!.status !== 'terminou' && l.pedido.situacao !== 'entregue'))
    .sort((a, b) => ordem[a.envio!.status] - ordem[b.envio!.status] || (b.envio!.ultimoEnvioEm ?? '').localeCompare(a.envio!.ultimoEnvioEm ?? ''));
  const conta = (s: string) => todos.filter((l) => l.envio!.status === s).length;

  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>Envio de conteúdo</h1>
          <p>Cada pedido tem um link só da artesã. O formulário é o mesmo que você já usa.</p>
        </div>
      </header>
      <div className="indicadores">
        <div className="ind">
          <strong>{conta('nao_comecou')}</strong>
          <span>não começaram</span>
        </div>
        <div className="ind azul">
          <strong>{conta('enviando')}</strong>
          <span>preenchendo</span>
        </div>
        <div className="ind verde">
          <strong>{conta('terminou')}</strong>
          <span>completos</span>
        </div>
      </div>
      <nav className="abas-painel" aria-label="Filtro">
        {[
          ['abertos', 'Pendentes'],
          ['completos', 'Completos'],
          ['todos', 'Todos'],
        ].map(([k, t]) => (
          <Link key={k} href={`/admin/envios?ver=${k}`} className={ver === k ? 'ativa' : ''}>
            {t}
          </Link>
        ))}
      </nav>
      {lista.length === 0 ? (
        <p className="vazio">Nada por aqui.</p>
      ) : (
        <div className="cartoes">
          {lista.map(({ pedido: p, cliente: c, envio: e }) => (
            <section key={p.id} className="cartao">
              <div className="cabeca-cartao">
                <div>
                  <h3>{c.atelie || c.nome}</h3>
                  <span className="discreto">
                    {c.nome} · {p.servico || 'serviço'}
                  </span>
                </div>
                <span className={`etiqueta e-${e!.status}`}>{STATUS_ENVIO[e!.status]}</span>
              </div>
              <div className="linha">
                <span className="barra grossa" style={{ flex: 1 }}>
                  <span className="barra-cheia" style={{ width: `${e!.pct}%` }} />
                </span>
                <b className="num">{e!.pct}%</b>
              </div>
              <div className="secoes">
                {e!.itens
                  .filter((i) => !i.opcional)
                  .map((i) => (
                    <span key={i.nome} className={i.ok ? 'ok' : 'pendente'}>
                      {i.nome}
                    </span>
                  ))}
              </div>
              <p className="discreto">{e!.ultimoEnvioEm ? `Último envio em ${dataHoraBr(e!.ultimoEnvioEm)}` : 'Ainda não abriu o link'}</p>
              <code className="link-copiar">{linkArtesa(base, e!.token)}</code>
              <div className="linha">
                <BotaoCopiar texto={linkArtesa(base, e!.token)} />
                <a className="botao azul pequeno" href={linkWhatsApp(base, { nome: c.nome, whatsapp: c.whatsapp, token: e!.token })} target="_blank" rel="noreferrer">
                  Enviar no WhatsApp
                </a>
                <Link className="botao pequeno" href={`/admin/pedidos/${p.id}?aba=conteudo`}>
                  Ver conteúdo
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
