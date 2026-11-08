import Link from 'next/link';
import FormCliente from '@/components/admin/FormCliente';

export default function NovaArtesa() {
  return (
    <>
      <Link href="/admin/artesas" className="botao-texto">
        ← Artesãs
      </Link>
      <header className="cabeca-pagina">
        <div>
          <h1>Nova artesã</h1>
          <p>Depois de salvar, cadastre o pedido dela para gerar o link de envio de conteúdo.</p>
        </div>
      </header>
      <FormCliente />
    </>
  );
}
