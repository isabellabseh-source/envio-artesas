'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Opcao = { id: string; nome: string };

/** Adds a site to the agenda: typed by hand (for clients outside the system) or picked from the artisans. */
export default function NovoNaAgenda({ artesas }: { artesas: Opcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [artesaId, setArtesaId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  if (!aberto) {
    return (
      <button className="botao" onClick={() => setAberto(true)}>
        + Novo site na agenda
      </button>
    );
  }

  return (
    <form
      className="cartao pilha"
      onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        const r = await fetch('/api/admin/agenda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(artesaId ? { artesaId } : { nome }),
        });
        setSalvando(false);
        if (!r.ok) return setErro('Não foi possível criar. Tente de novo.');
        const { id } = await r.json();
        router.push(`/admin/agenda/${id}`);
      }}
    >
      <h2>Novo site na agenda</h2>
      {artesas.length > 0 && (
        <label className="campo">
          <span className="rotulo">Artesã do sistema</span>
          <select value={artesaId} onChange={(e) => setArtesaId(e.target.value)}>
            <option value="">Não está no sistema (digitar o nome)</option>
            {artesas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      {!artesaId && (
        <label className="campo">
          <span className="rotulo">Nome da artesã ou do ateliê</span>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
      )}
      <div className="linha">
        <button type="button" className="botao secundario" onClick={() => setAberto(false)}>
          Cancelar
        </button>
        <button className="botao" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar'}
        </button>
      </div>
      {erro && <p className="erro">{erro}</p>}
    </form>
  );
}
