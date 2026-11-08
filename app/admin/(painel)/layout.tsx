import Link from 'next/link';
import { exigirLogin } from '@/lib/auth';
import { carregarPainel } from '@/lib/negocio';
import { calcularAlertas } from '@/lib/alertas';
import Menu from '@/components/admin/Menu';

export const dynamic = 'force-dynamic';

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const u = await exigirLogin();
  const { linhas, vagas } = await carregarPainel();
  const alertas = calcularAlertas(linhas, vagas).length;
  return (
    <div className="app-painel">
      <aside className="menu-lateral">
        <Link href="/admin" className="marca-isa">
          <img src="/isa.webp" alt="Isa Barros" />
          <div>
            <b>Isa Barros</b>
            <span>Ateliê de sites</span>
          </div>
        </Link>
        <Menu alertas={alertas} />
        <div className="rodape-menu">
          <span>{u.email}</span>
          <form method="post" action="/api/admin/sair">
            <button className="botao-texto">Sair</button>
          </form>
        </div>
      </aside>
      <main className="conteudo-painel">{children}</main>
    </div>
  );
}
