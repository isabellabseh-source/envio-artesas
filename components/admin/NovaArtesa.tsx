'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovaArtesa() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', atelie: '', whatsapp: '' });
  const [salvando, setSalvando] = useState(false);

  if (!aberto) {
    return (
      <button className="botao" onClick={() => setAberto(true)}>
        + Cadastrar artesã
      </button>
    );
  }

  return (
    <form
      className="cartao pilha"
      onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        const r = await fetch('/api/admin/artesas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        setSalvando(false);
        if (!r.ok) return alert('Não foi possível cadastrar.');
        const { id } = await r.json();
        router.push(`/admin/${id}`);
      }}
    >
      <h2>Nova artesã</h2>
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
          {salvando ? 'Salvando…' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}
