import Link from 'next/link';
import { exigirLogin } from '@/lib/auth';
import { listarArtesas } from '@/lib/store';
import { STATUS_LABEL, progresso } from '@/lib/types';
import { linkWhatsApp } from '@/lib/links';
import { enderecoBase } from '@/lib/endereco';
import NovaArtesa from '@/components/admin/NovaArtesa';

export const dynamic = 'force-dynamic';

export default async function Painel() {
  await exigirLogin();
  const artesas = await listarArtesas();
  const base = await enderecoBase();
  const terminaram = artesas.filter((a) => a.status === 'terminou').length;

  return (
    <div className="painel">
      <header className="painel-topo">
        <h1>Suas artesãs</h1>
        <form method="post" action="/api/admin/sair">
          <button className="botao-texto">Sair</button>
        </form>
      </header>

      {terminaram > 0 && (
        <div className="caixa-aviso">
          {terminaram === 1 ? '1 artesã terminou o envio' : `${terminaram} artesãs terminaram o envio`} e está esperando você.
        </div>
      )}

      <NovaArtesa />

      {artesas.length === 0 ? (
        <p className="discreto">Nenhuma artesã cadastrada ainda. Cadastre a primeira acima.</p>
      ) : (
        <ul className="tabela-artesas">
          {artesas.map((a) => {
            const p = progresso(a.dados);
            return (
              <li key={a.id}>
                <Link href={`/admin/${a.id}`} className="artesa-linha">
                  <span className="artesa-nome">
                    <strong>{a.atelie || a.nome}</strong>
                    <span className="discreto">{a.nome}</span>
                  </span>
                  <span className={`etiqueta etiqueta-${a.status}`}>{STATUS_LABEL[a.status]}</span>
                  <span className="artesa-prog">
                    <span className="barra pequena">
                      <span className="barra-cheia" style={{ width: `${p.pct}%` }} />
                    </span>
                    <span className="discreto">
                      {p.feitas}/{p.total} · {p.produtos} produtos
                    </span>
                  </span>
                </Link>
                <a className="botao secundario pequeno" href={linkWhatsApp(base, a)} target="_blank" rel="noreferrer">
                  Enviar link no WhatsApp
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
