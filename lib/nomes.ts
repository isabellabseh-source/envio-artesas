/** Safe file/folder name: keeps letters (with accents), digits, spaces, "-", "," and "$". */
export function nomeArquivo(t: string, padrao = 'sem nome') {
  const limpo = t.replace(/[\\/:*?"<>|\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return limpo || padrao;
}
