import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { envioComCliente } from '@/lib/store';
import { nomeArquivo } from '@/lib/nomes';
import { Foto } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * What goes in the photos .zip and where to fetch each file. The browser downloads the files and builds the
 * zip itself, so the server never holds hundreds of photos in memory at once.
 * Full-quality photos, one folder per category, named after the product and its price, plus the PDFs.
 * Videos stay out (too big); the panel has a download button for each one.
 */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const a = (await envioComCliente((await params).id))?.artesa;
  if (!a) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 });
  const d = a.dados;
  const itens: { nome: string; path: string }[] = [];
  const usados = new Set<string>();

  const adicionar = (pasta: string, base: string, f: Foto) => {
    const ext = f.path.split('.').pop();
    let nome = `${pasta}/${base}.${ext}`;
    for (let n = 2; usados.has(nome); n++) nome = `${pasta}/${base} (${n}).${ext}`;
    usados.add(nome);
    itens.push({ nome, path: f.path });
  };

  for (const c of d.categorias) {
    const pasta = `Catálogo/${nomeArquivo(c.nome)}`;
    for (const p of c.produtos) {
      const preco = p.temVariacoes ? 'varios tamanhos' : `R$${p.valor || ' sem valor'}`;
      const base = nomeArquivo(`${p.nome || 'Sem nome'} - ${preco}`);
      for (const [i, f] of p.fotos.entries()) adicionar(pasta, `${base} - ${i + 1}`, f);
    }
  }
  if (d.identidade.logo) adicionar('Página inicial', 'Logo', d.identidade.logo);
  for (const [i, f] of (d.identidade.inspiracoes ?? []).entries()) adicionar('Página inicial', `Inspiração ${i + 1}`, f);
  for (const pdf of d.identidade.pdfs ?? []) adicionar('Página inicial/PDFs', nomeArquivo(pdf.nome.replace(/\.pdf$/i, '')), pdf);
  if (d.sobre.foto) adicionar('Página inicial', 'Foto sobre nós', d.sobre.foto);
  for (const [i, dep] of d.depoimentos.entries()) {
    if (dep.print) adicionar('Página inicial/Depoimentos', nomeArquivo(`${i + 1} - ${dep.nome || 'cliente'}`), dep.print);
  }

  const local = (p: string) => (p.endsWith('.pdf') ? `/api/admin/arquivo/${p}` : `/api/admin/foto/${p}`);
  return NextResponse.json({
    nomeZip: `${nomeArquivo(a.atelie || a.nome)} - fotos.zip`,
    arquivos: itens.map((i) => ({ nome: i.nome, url: local(i.path) })),
  });
}
