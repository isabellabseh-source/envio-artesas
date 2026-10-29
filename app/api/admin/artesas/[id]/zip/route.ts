import JSZip from 'jszip';
import { estaLogada } from '@/lib/auth';
import { buscarArtesa, lerFoto } from '@/lib/store';
import { nomeArquivo } from '@/lib/nomes';
import { Foto } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Full-quality photos, one folder per category, named after the product and its price. */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const a = await buscarArtesa((await params).id);
  if (!a) return new Response('Não encontrada', { status: 404 });
  const d = a.dados;
  const zip = new JSZip();
  const usados = new Set<string>();

  const adicionar = async (pasta: string, base: string, f: Foto) => {
    const conteudo = await lerFoto(f.path);
    if (!conteudo) return;
    const ext = f.path.endsWith('.png') ? 'png' : 'jpg';
    let nome = `${pasta}/${base}.${ext}`;
    for (let n = 2; usados.has(nome); n++) nome = `${pasta}/${base} (${n}).${ext}`;
    usados.add(nome);
    zip.file(nome, conteudo);
  };

  for (const c of d.categorias) {
    const pasta = `Catálogo/${nomeArquivo(c.nome)}`;
    for (const p of c.produtos) {
      const preco = p.temVariacoes ? 'varios tamanhos' : `R$${p.valor || ' sem valor'}`;
      const base = nomeArquivo(`${p.nome || 'Sem nome'} - ${preco}`);
      for (const [i, f] of p.fotos.entries()) await adicionar(pasta, `${base} - ${i + 1}`, f);
    }
  }
  if (d.identidade.logo) await adicionar('Página inicial', 'Logo', d.identidade.logo);
  for (const [i, f] of (d.identidade.inspiracoes ?? []).entries()) await adicionar('Página inicial', `Inspiração ${i + 1}`, f);
  if (d.sobre.foto) await adicionar('Página inicial', 'Foto sobre nós', d.sobre.foto);
  for (const [i, dep] of d.depoimentos.entries()) {
    if (dep.print) await adicionar('Página inicial/Depoimentos', nomeArquivo(`${i + 1} - ${dep.nome || 'cliente'}`), dep.print);
  }

  const conteudo = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  const nome = `${nomeArquivo(a.atelie || a.nome)} - fotos.zip`;
  return new Response(conteudo as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
    },
  });
}
