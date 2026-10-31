import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirLogin } from '@/lib/auth';
import { buscarArtesa } from '@/lib/store';
import { Arquivo, Foto, STATUS_LABEL, progresso } from '@/lib/types';
import { nomeArquivo } from '@/lib/nomes';
import { linkArtesa, linkWhatsApp } from '@/lib/links';
import { enderecoBase } from '@/lib/endereco';
import AcoesArtesa from '@/components/admin/AcoesArtesa';
import EditarCadastro from '@/components/admin/EditarCadastro';
import FichaPainel from '@/components/admin/FichaPainel';
import { lerFicha } from '@/lib/agenda';

export const dynamic = 'force-dynamic';

const url = (f: Foto) => `/api/admin/foto/${f.path}`;
/** Downloads a PDF or video under a readable name. */
const urlArquivo = (a: Arquivo, nome: string) =>
  `/api/admin/arquivo/${a.path}?nome=${encodeURIComponent(`${nomeArquivo(nome)}.${a.path.split('.').pop()}`)}`;

function Linha({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div className="ficha-linha">
      <span className="discreto">{rotulo}</span>
      <span>{valor?.trim() ? valor : <em className="falta">não preenchido</em>}</span>
    </div>
  );
}

export default async function FichaArtesa({ params }: { params: Promise<{ id: string }> }) {
  await exigirLogin();
  const a = await buscarArtesa((await params).id);
  if (!a) notFound();
  const base = await enderecoBase();
  const ficha = await lerFicha(a.id);
  const d = a.dados;
  const p = progresso(d);
  const dataBr = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return (
    <div className="painel">
      <div className="linha">
        <Link href="/admin" className="botao-texto">
          ← Todas as artesãs
        </Link>
        <Link href="/admin/agenda" className="botao-texto">
          Agenda de sites
        </Link>
      </div>
      <header className="painel-topo">
        <div>
          <h1>{a.atelie || a.nome}</h1>
          <p className="discreto">
            {a.nome} · {STATUS_LABEL[a.status]}
            {a.terminou_em ? ` em ${dataBr(a.terminou_em)}` : ''} · {p.feitas}/{p.total} seções completas
          </p>
        </div>
        <div className="linha">
          <a className="botao" href={`/api/admin/artesas/${a.id}/pdf`}>
            Baixar PDF
          </a>
          <a className="botao secundario" href={`/api/admin/artesas/${a.id}/zip`}>
            Baixar fotos (.zip)
          </a>
        </div>
      </header>

      <section className="cartao pilha">
        <h2>Link da artesã</h2>
        <code className="link-copiar">{linkArtesa(base, a.token)}</code>
        <div className="linha">
          <a className="botao secundario pequeno" href={linkWhatsApp(base, a)} target="_blank" rel="noreferrer">
            Enviar no WhatsApp
          </a>
          <AcoesArtesa id={a.id} status={a.status} />
        </div>
        <p className="discreto">WhatsApp: {a.whatsapp || 'não informado'}</p>
        <EditarCadastro key={`${a.nome}|${a.atelie}|${a.whatsapp}`} id={a.id} nome={a.nome} atelie={a.atelie} whatsapp={a.whatsapp} />
      </section>

      <FichaPainel id={a.id} inicial={ficha} terminouEm={a.terminou_em} />

      <section className="cartao">
        <h2>Catálogo</h2>
        {d.categorias.length === 0 && <p className="falta">Nenhuma categoria enviada.</p>}
        {d.categorias.map((c) => (
          <div key={c.id} className="ficha-categoria">
            <h3>
              {c.nome} <span className="discreto">· {c.produtos.length} produtos</span>
            </h3>
            {c.produtos.map((pr) => (
              <div key={pr.id} className="ficha-produto">
                <div className="fotos pequenas">
                  {pr.fotos.map((f) => (
                    <a key={f.path} href={url(f)} target="_blank" rel="noreferrer">
                      <img src={url(f)} alt="" />
                    </a>
                  ))}
                </div>
                <div>
                  <strong>{pr.nome || 'Sem nome'}</strong>
                  {pr.temVariacoes ? (
                    <ul>
                      {pr.variacoes.map((v, i) => (
                        <li key={i}>
                          {v.tamanho}: R$ {v.valor}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      R$ {pr.valor || '—'} {pr.tamanho && `· ${pr.tamanho}`}
                    </p>
                  )}
                  {pr.obs && <p className="discreto">{pr.obs}</p>}
                  {pr.video && (
                    <p>
                      <a className="botao secundario pequeno" href={urlArquivo(pr.video, `${pr.nome || 'Produto'} - vídeo`)}>
                        🎬 Baixar vídeo
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="cartao">
        <h2>Página inicial</h2>
        <div className="ficha-grade">
          <div>
            <h3>Identidade visual</h3>
            {d.identidade.logo ? <img className="logo" src={url(d.identidade.logo)} alt="Logo" /> : <p className="falta">Sem logo</p>}
            <Linha rotulo="Cores" valor={d.identidade.cores} />
            <Linha rotulo="Tema" valor={d.identidade.tema === 'Outro' ? d.identidade.temaOutro : d.identidade.tema} />
            {!!d.identidade.inspiracoes?.length && (
              <div className="fotos pequenas">
                {d.identidade.inspiracoes.map((f) => (
                  <img key={f.path} src={url(f)} alt="Inspiração" />
                ))}
              </div>
            )}
            {(d.identidade.pdfs ?? []).map((a) => (
              <p key={a.path}>
                <a href={urlArquivo(a, a.nome.replace(/\.pdf$/i, ''))}>📄 {a.nome}</a>
              </p>
            ))}
          </div>
          <div>
            <h3>Sobre o ateliê</h3>
            {d.sobre.foto && <img className="logo" src={url(d.sobre.foto)} alt="Foto" />}
            <p className="texto-livre">{d.sobre.texto || <em className="falta">não preenchido</em>}</p>
          </div>
          <div>
            <h3>Pagamento e envio</h3>
            <Linha rotulo="Pagamento" valor={[...d.comercial.pagamentos, d.comercial.pagamentoOutro].filter(Boolean).join(', ')} />
            <Linha rotulo="Envio" valor={[...d.comercial.envios, d.comercial.envioOutro].filter(Boolean).join(', ')} />
            <Linha rotulo="Taxa local" valor={d.comercial.taxaLocal} />
          </div>
          <div>
            <h3>Links</h3>
            <Linha rotulo="WhatsApp" valor={d.links.whatsapp} />
            <Linha rotulo="Instagram" valor={d.links.instagram} />
            <Linha rotulo="Facebook" valor={d.links.facebook} />
            <Linha rotulo="Shopee" valor={d.links.shopee} />
            <Linha rotulo="Outro" valor={d.links.outro} />
          </div>
        </div>
        <h3>Depoimentos</h3>
        {d.depoimentos.length === 0 && <p className="discreto">Nenhum.</p>}
        {d.depoimentos.map((dep) => (
          <blockquote key={dep.id}>
            {dep.texto}
            {dep.print && <img className="logo" src={url(dep.print)} alt="Print" />}
            <footer>{dep.nome}</footer>
          </blockquote>
        ))}
      </section>

      <section className="cartao">
        <h2>Domínio</h2>
        <div className="ficha-grade">
          <div>
            <Linha rotulo="Autorizou uso dos dados" valor={d.dominio.consentimento ? 'Sim' : ''} />
            <Linha rotulo="Nome completo" valor={d.dominio.nomeCompleto} />
            <Linha rotulo="Nascimento" valor={d.dominio.nascimento.split('-').reverse().join('/')} />
            <Linha rotulo="CPF" valor={d.dominio.cpf} />
            <Linha rotulo="CNPJ" valor={d.dominio.cnpj || 'não tem'} />
            <Linha rotulo="CEP" valor={d.dominio.cep} />
            <Linha rotulo="Endereço" valor={d.dominio.endereco} />
          </div>
          <div>
            <Linha rotulo="Telefone" valor={d.dominio.telefone} />
            <Linha rotulo="E-mail" valor={d.dominio.email} />
            <Linha rotulo="Nome do ateliê" valor={d.dominio.nomeAtelie} />
            <Linha rotulo="Endereço do site" valor={d.dominio.enderecoSite} />
          </div>
        </div>
      </section>
    </div>
  );
}
