'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { id: string; nome: string; atelie: string; whatsapp: string };

/** Fixes a typo in the sign-up details, or removes the artisan with everything she sent. */
export default function EditarCadastro({ id, nome, atelie, whatsapp }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome, atelie, whatsapp });
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState(false);

  if (!aberto) {
    return (
      <button className="botao-texto" onClick={() => setAberto(true)}>
        Editar ou excluir cadastro
      </button>
    );
  }

  return (
    <form
      className="cartao pilha"
      onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        const r = await fetch(`/api/admin/artesas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'cadastro', ...form }),
        });
        setSalvando(false);
        if (!r.ok) return alert('Não foi possível salvar.');
        setAberto(false);
        router.refresh();
      }}
    >
      <h2>Cadastro</h2>
      <div className="campo">
        <label className="rotulo">Nome</label>
        <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      </div>
      <div className="campo">
        <label className="rotulo">Nome do ateliê</label>
        <input value={form.atelie} onChange={(e) => setForm({ ...form, atelie: e.target.value })} />
      </div>
      <div className="campo">
        <label className="rotulo">WhatsApp (com DDD)</label>
        <input inputMode="tel" required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
      </div>
      <div className="linha">
        <button type="button" className="botao secundario" onClick={() => setAberto(false)}>
          Cancelar
        </button>
        <button className="botao" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {!excluir ? (
        <button type="button" className="botao-texto perigo" onClick={() => setExcluir(true)}>
          Excluir esta artesã
        </button>
      ) : (
        <div className="confirmar">
          <p>Excluir {nome} e tudo o que ela enviou, inclusive as fotos? Não dá para desfazer.</p>
          <div className="linha">
            <button type="button" className="botao secundario pequeno" onClick={() => setExcluir(false)}>
              Não
            </button>
            <button
              type="button"
              className="botao pequeno"
              disabled={salvando}
              onClick={async () => {
                setSalvando(true);
                const r = await fetch(`/api/admin/artesas/${id}`, { method: 'DELETE' });
                setSalvando(false);
                if (!r.ok) return alert('Não foi possível excluir.');
                router.push('/admin');
                router.refresh();
              }}
            >
              Sim, excluir
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
