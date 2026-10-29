export function respostaFoto(caminho: string, conteudo: Buffer | null) {
  if (!conteudo) return new Response('Não encontrado', { status: 404 });
  return new Response(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': caminho.endsWith('.png') ? 'image/png' : 'image/jpeg',
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
