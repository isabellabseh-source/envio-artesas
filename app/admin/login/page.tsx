import { Coracao } from '@/components/Enfeites';

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="centro">
      <form className="cartao cartao-costurado pilha" method="post" action="/api/admin/login">
        <div className="linha">
          <Coracao tamanho={36} />
          <h1 style={{ margin: 0 }}>Painel Isa Barros</h1>
        </div>
        <div className="campo">
          <label className="rotulo" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" autoComplete="username" autoFocus required />
        </div>
        <div className="campo">
          <label className="rotulo" htmlFor="senha">
            Senha
          </label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        {erro === 'bloqueado' && <p className="erro">Muitas tentativas erradas. Espere 15 minutos e tente de novo.</p>}
        {erro === '1' && <p className="erro">E-mail ou senha incorretos.</p>}
        <button className="botao largo">Entrar</button>
      </form>
    </main>
  );
}
