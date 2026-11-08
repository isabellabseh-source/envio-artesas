'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { dataBr, maiuscula, mesBr } from '@/lib/modelo';
import { api, avisar } from './cliente';

type MesVagas = { mes: string; total: number; ocupadas: number; definido: boolean };

export function Vagas({ padrao, meses }: { padrao: number; meses: MesVagas[] }) {
  const router = useRouter();
  const [p, setP] = useState(String(padrao));
  const [valores, setValores] = useState<Record<string, string>>(Object.fromEntries(meses.filter((m) => m.definido).map((m) => [m.mes, String(m.total)])));
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      const limpos: Record<string, number> = {};
      for (const [k, v] of Object.entries(valores)) if (v.trim() !== '') limpos[k] = Number(v);
      await api('/api/admin/vagas', 'PUT', { padrao: Number(p), meses: limpos });
      avisar('Vagas salvas');
      router.refresh();
    } catch (err) {
      avisar((err as Error).message);
    }
    setSalvando(false);
  };
  return (
    <>
      <label className="campo" htmlFor="vagas-padrao" style={{ maxWidth: 260 }}>
        <span className="rotulo">Vagas por mês (padrão)</span>
        <input id="vagas-padrao" type="number" min={0} value={p} onChange={(e) => setP(e.target.value)} />
      </label>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Vagas</th>
              <th className="valor">Ocupadas</th>
              <th className="valor">Livres</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const total = valores[m.mes]?.trim() ? Number(valores[m.mes]) : Number(p) || 0;
              const livres = total - m.ocupadas;
              return (
                <tr key={m.mes}>
                  <td>{maiuscula(mesBr(m.mes))}</td>
                  <td>
                    <input
                      id={`vagas-${m.mes}`}
                      aria-label={`Vagas em ${mesBr(m.mes)}`}
                      type="number"
                      min={0}
                      placeholder={p}
                      style={{ width: 90 }}
                      value={valores[m.mes] ?? ''}
                      onChange={(e) => setValores({ ...valores, [m.mes]: e.target.value })}
                    />
                  </td>
                  <td className="valor">{m.ocupadas}</td>
                  <td className={`valor ${livres <= 0 ? 'atrasado-txt' : ''}`}>{Math.max(0, livres)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="discreto">Deixe em branco para usar o padrão. Pedidos pausados continuam ocupando a vaga até você mudar o mês deles.</p>
      <button type="button" className="botao" style={{ alignSelf: 'flex-start' }} disabled={salvando} onClick={salvar}>
        {salvando ? 'Salvando…' : 'Salvar vagas'}
      </button>
    </>
  );
}

export function TrocarSenha() {
  const [v, setV] = useState({ atual: '', nova: '', repetir: '' });
  const [msg, setMsg] = useState('');
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (v.nova !== v.repetir) return setMsg('As duas senhas novas não são iguais.');
    try {
      await api('/api/admin/senha', 'POST', { atual: v.atual, nova: v.nova });
      setV({ atual: '', nova: '', repetir: '' });
      avisar('Senha trocada. Os outros aparelhos vão pedir a senha nova.');
    } catch (err) {
      setMsg((err as Error).message);
    }
  };
  return (
    <form className="campos" onSubmit={salvar}>
      <label className="campo" htmlFor="s-atual">
        <span className="rotulo">Senha atual</span>
        <input id="s-atual" type="password" autoComplete="current-password" required value={v.atual} onChange={(e) => setV({ ...v, atual: e.target.value })} />
      </label>
      <label className="campo" htmlFor="s-nova">
        <span className="rotulo">Nova senha</span>
        <input id="s-nova" type="password" autoComplete="new-password" minLength={8} required value={v.nova} onChange={(e) => setV({ ...v, nova: e.target.value })} />
      </label>
      <label className="campo" htmlFor="s-repetir">
        <span className="rotulo">Repita a nova senha</span>
        <input id="s-repetir" type="password" autoComplete="new-password" required value={v.repetir} onChange={(e) => setV({ ...v, repetir: e.target.value })} />
      </label>
      {msg && <p className="erro largo">{msg}</p>}
      <div className="largo">
        <button className="botao secundario">Trocar senha</button>
      </div>
    </form>
  );
}

type ItemLixeira = { tipo: 'cliente' | 'pedido'; id: string; nome: string; excluidoEm: string };

export function Lixeira({ itens }: { itens: ItemLixeira[] }) {
  const router = useRouter();
  const [apagando, setApagando] = useState<string | null>(null);
  const agir = async (acao: 'restaurar' | 'apagar', i: ItemLixeira) => {
    try {
      await api('/api/admin/lixeira', 'POST', { acao, tipo: i.tipo, id: i.id });
      avisar(acao === 'restaurar' ? 'Recuperado' : 'Apagado de vez');
      router.refresh();
    } catch (err) {
      avisar((err as Error).message);
    }
    setApagando(null);
  };
  if (!itens.length) return <p className="discreto">A lixeira está vazia.</p>;
  return (
    <ul className="lista-mes">
      {itens.map((i) => (
        <li key={i.id}>
          <span>
            <b>{i.nome}</b>
            <br />
            <span className="discreto">
              {i.tipo === 'cliente' ? 'Artesã e pedidos' : 'Pedido'} · excluído em {dataBr(i.excluidoEm)}
            </span>
          </span>
          <button type="button" className="botao secundario pequeno" onClick={() => agir('restaurar', i)}>
            Recuperar
          </button>
          <div className="acoes">
            {apagando === i.id ? (
              <>
                <span>Apagar de vez, com fotos e arquivos? Não tem volta.</span>
                <button type="button" className="botao-texto perigo" onClick={() => agir('apagar', i)}>
                  Sim, apagar
                </button>
                <button type="button" className="botao-texto" onClick={() => setApagando(null)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button type="button" className="botao-texto perigo" onClick={() => setApagando(i.id)}>
                Apagar de vez
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

type Resultado = { nome: string; novo: boolean; copiados: number; falhas: number };

/** Imports everything from the old system, one artisan at a time, with progress. Safe to run again. */
export function Migrar() {
  const router = useRouter();
  const [estado, setEstado] = useState<string | null>(null);
  const [resumo, setResumo] = useState<string[]>([]);
  const comecar = async () => {
    setResumo([]);
    setEstado('Lendo o sistema antigo…');
    const linhas: string[] = [];
    try {
      const { artesas, avulsas } = await api<{ artesas: string[]; avulsas: string[] }>('/api/admin/migrar', 'GET');
      const itens = [...artesas.map((id) => ({ tipo: 'artesa', id })), ...avulsas.map((id) => ({ tipo: 'avulsa', id }))];
      let novos = 0;
      let arquivos = 0;
      for (const [i, item] of itens.entries()) {
        setEstado(`Trazendo ${i + 1} de ${itens.length}…`);
        try {
          const r = await api<Resultado>('/api/admin/migrar', 'POST', item);
          if (r.novo) novos++;
          arquivos += r.copiados;
          if (r.falhas) linhas.push(`${r.nome}: ${r.falhas} arquivo(s) não vieram. Rode de novo para tentar outra vez.`);
        } catch (err) {
          linhas.push(`Um item não veio: ${(err as Error).message}`);
        }
      }
      linhas.unshift(`Pronto! ${novos} novo(s) cadastro(s), ${itens.length - novos} já estavam aqui, ${arquivos} arquivo(s) conferidos.`);
      router.refresh();
    } catch (err) {
      linhas.push((err as Error).message);
    }
    setResumo(linhas);
    setEstado(null);
  };
  return (
    <>
      <button type="button" className="botao" disabled={!!estado} onClick={comecar} style={{ alignSelf: 'flex-start' }}>
        {estado ?? 'Trazer dados do sistema antigo'}
      </button>
      {resumo.map((l, i) => (
        <p key={i} className={i === 0 ? '' : 'erro'}>
          {l}
        </p>
      ))}
    </>
  );
}
