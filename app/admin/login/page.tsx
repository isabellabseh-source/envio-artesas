export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="centro">
      <form className="cartao pilha" method="post" action="/api/admin/login">
        <h1>Painel</h1>
        <div className="campo">
          <label className="rotulo" htmlFor="senha">
            Senha
          </label>
          <input id="senha" name="senha" type="password" autoFocus required />
        </div>
        {erro && <p className="erro">Senha incorreta.</p>}
        <button className="botao largo">Entrar</button>
      </form>
    </main>
  );
}
