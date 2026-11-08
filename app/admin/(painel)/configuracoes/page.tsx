import { usuarioAtual } from '@/lib/auth';
import { carregarPainel } from '@/lib/negocio';
import { mesesComVagas } from '@/lib/agenda';
import { usoTotal } from '@/lib/arquivos';
import { usandoMysql } from '@/lib/db';
import { Lixeira, Migrar, TrocarSenha, Vagas } from '@/components/admin/Configuracoes';
import { migracaoConfigurada } from '@/lib/migracao';
import { tamanhoBr } from '@/lib/modelo';


export default async function Configuracoes() {
  const u = await usuarioAtual();
  const { linhas, vagas, lixeira, todosClientes } = await carregarPainel();
  const meses = mesesComVagas(linhas, vagas, 1, 12).map((m) => ({ ...m, definido: m.mes in vagas.meses }));
  const uso = await usoTotal();
  const limiteGb = Number(process.env.LIMITE_ESPACO_GB || 50);
  const pct = Math.min(100, Math.round((uso.bytes / (limiteGb * 1024 ** 3)) * 100));
  const nome = (id: string) => {
    const c = todosClientes.find((x) => x.id === id);
    return c ? c.atelie || c.nome : 'Artesã';
  };
  const itens = [
    ...lixeira.clientes.map((c) => ({ tipo: 'cliente' as const, id: c.id, nome: c.atelie || c.nome, excluidoEm: c.excluidoEm! })),
    ...lixeira.pedidos.map((p) => ({ tipo: 'pedido' as const, id: p.id, nome: `${nome(p.clienteId)}: ${p.servico || 'pedido'}`, excluidoEm: p.excluidoEm! })),
  ].sort((a, b) => b.excluidoEm.localeCompare(a.excluidoEm));

  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>Configurações</h1>
          <p>Vagas da agenda, acesso, espaço e cópias de segurança.</p>
        </div>
      </header>
      <div className="grade-2">
        <section className="cartao">
          <h2>Vagas por mês</h2>
          <Vagas padrao={vagas.padrao} meses={meses} />
        </section>
        <div className="coluna">
          <section className="cartao cartao-costurado">
            <h2>Cópia de segurança</h2>
            <p>Baixe um arquivo com todas as artesãs, pedidos, pagamentos, conteúdos e histórico. Guarde no computador ou no Google Drive, de preferência toda semana.</p>
            <p className="discreto">As fotos ficam no .zip de cada artesã. A Hostinger também faz backup diário de tudo.</p>
            <a className="botao azul" href="/api/admin/backup" style={{ alignSelf: 'flex-start' }}>
              Baixar backup
            </a>
          </section>
          <section className="cartao">
            <h2>Espaço usado</h2>
            <div className="linha">
              <span className="barra grossa" style={{ flex: 1 }}>
                <span className="barra-cheia" style={{ width: `${Math.max(2, pct)}%` }} />
              </span>
              <b className="num">{pct}%</b>
            </div>
            <p className="discreto">
              {tamanhoBr(uso.bytes)} em {uso.arquivos.toLocaleString('pt-BR')} arquivos, de {limiteGb} GB do plano (o plano é dividido com os seus outros sites). Para
              liberar espaço, abra um pedido entregue, baixe o .zip das fotos e use “Liberar espaço”.
            </p>
          </section>
          {migracaoConfigurada() && (
            <section className="cartao cartao-costurado">
              <h2>Trazer do sistema antigo</h2>
              <p>
                Copia as artesãs, os conteúdos, as fotos e a agenda do sistema antigo para cá. Os links que você já mandou continuam iguais. Nada é apagado
                no sistema antigo, e pode rodar de novo sem duplicar.
              </p>
              <Migrar />
            </section>
          )}
          <section className="cartao">
            <h2>Acesso ao painel</h2>
            <p className="discreto">Entrando como {u?.email}</p>
            <TrocarSenha />
          </section>
          <section className="cartao">
            <h2>Lixeira</h2>
            <p className="discreto">Itens excluídos ficam aqui por 30 dias e depois são apagados de vez.</p>
            <Lixeira itens={itens} />
          </section>
          <p className="discreto">Banco de dados: {usandoMysql() ? 'MySQL' : 'arquivos locais (modo de teste)'}.</p>
        </div>
      </div>
    </>
  );
}
