'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Cliente, hoje } from '@/lib/modelo';
import { api, avisar } from './cliente';

export default function FormCliente({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const [v, setV] = useState({
    nome: cliente?.nome ?? '',
    atelie: cliente?.atelie ?? '',
    whatsapp: cliente?.whatsapp ?? '',
    instagram: cliente?.instagram ?? '',
    email: cliente?.email ?? '',
    contratacao: cliente?.contratacao ?? hoje(),
    obs: cliente?.obs ?? '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campo = (k: keyof typeof v) => ({
    id: `c-${k}`,
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value }),
  });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (cliente) {
        await api(`/api/admin/clientes/${cliente.id}`, 'PATCH', v);
        avisar('Cadastro salvo');
        router.push(`/admin/artesas/${cliente.id}`);
      } else {
        const r = await api<{ id: string }>('/api/admin/clientes', 'POST', v);
        avisar('Artesã cadastrada');
        router.push(`/admin/artesas/${r.id}`);
      }
      router.refresh();
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  };

  return (
    <form className="cartao" onSubmit={salvar}>
      <div className="campos">
        <label className="campo" htmlFor="c-nome">
          <span className="rotulo">Nome completo</span>
          <input required {...campo('nome')} />
        </label>
        <label className="campo" htmlFor="c-atelie">
          <span className="rotulo">Ateliê ou empresa</span>
          <input {...campo('atelie')} />
        </label>
        <label className="campo" htmlFor="c-whatsapp">
          <span className="rotulo">WhatsApp com DDD</span>
          <input inputMode="tel" placeholder="(11) 98765-4321" {...campo('whatsapp')} />
        </label>
        <label className="campo" htmlFor="c-instagram">
          <span className="rotulo">Instagram</span>
          <input placeholder="@seuatelie" {...campo('instagram')} />
        </label>
        <label className="campo" htmlFor="c-email">
          <span className="rotulo">E-mail</span>
          <input type="email" {...campo('email')} />
        </label>
        <label className="campo" htmlFor="c-contratacao">
          <span className="rotulo">Data da contratação</span>
          <input type="date" {...campo('contratacao')} />
        </label>
        <label className="campo largo" htmlFor="c-obs">
          <span className="rotulo">Observações gerais</span>
          <textarea rows={3} {...campo('obs')} />
        </label>
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className="linha">
        <button className="botao" disabled={salvando}>
          {salvando ? 'Salvando…' : cliente ? 'Salvar cadastro' : 'Cadastrar artesã'}
        </button>
        <button type="button" className="botao secundario" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
