const STOPWORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'a',
  'o',
  'as',
  'os',
  'e',
  'em',
  'no',
  'na',
]);

/** Minúsculas, sem acentos e sem pontuação. */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Singularização simples para pt-BR (sem acentos). Palavras curtas ficam como estão. */
export function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('oes') || word.endsWith('aes')) return `${word.slice(0, -3)}ao`;
  if (word.length > 4 && word.endsWith('ais')) return `${word.slice(0, -3)}al`;
  if (word.length > 4 && word.endsWith('eis')) return `${word.slice(0, -3)}el`;
  if (word.endsWith('ns')) return `${word.slice(0, -2)}m`;
  if (word.length > 4 && word.endsWith('res')) return word.slice(0, -2);
  if (word.endsWith('zes')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  return stripAccents(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map(singularize);
}

export function normalizeText(text: string): string {
  return tokenize(text).join(' ');
}

/**
 * Sinônimos e nomes populares → termos usados na TACO.
 * Chaves e valores passam pela mesma normalização da busca (ver NORMALIZED_SYNONYMS).
 */
export const SYNONYMS: Readonly<Record<string, string>> = {
  aipim: 'mandioca',
  macaxeira: 'mandioca',
  mexerica: 'tangerina',
  bergamota: 'tangerina',
  jerimum: 'abobora',
  mussarela: 'mozarela',
  mucarela: 'mozarela',
  requeijao: 'queijo requeijao',
  refri: 'refrigerante',
  coca: 'refrigerante cola',
  bife: 'carne bovina',
  'pao frances': 'pao trigo frances',
  'pao sal': 'pao trigo frances',
  'pao integral': 'pao trigo forma integral',
  'pao forma': 'pao trigo forma',
  'peito frango': 'frango peito sem pele grelhado',
  'file frango': 'frango peito sem pele grelhado',
  'carne moida': 'carne bovina moido',
  'cafe preto': 'cafe infusao',
  'ovo cozido': 'ovo galinha inteiro cozido',
  'ovo frito': 'ovo galinha inteiro frito',
  'frango grelhado': 'frango peito sem pele grelhado',
};

// Frases mais longas primeiro, para "pao frances" vencer "pao".
const NORMALIZED_SYNONYMS: [string, string][] = Object.entries(SYNONYMS)
  .map(([from, to]): [string, string] => [normalizeText(from), normalizeText(to)])
  .sort((a, b) => b[0].length - a[0].length);

export function applySynonyms(normalized: string): string {
  let out = ` ${normalized} `;
  for (const [from, to] of NORMALIZED_SYNONYMS) {
    if (out.includes(` ${from} `)) out = out.replace(` ${from} `, ` ${to} `);
  }
  // "suco de laranja" → "laranja suco" (ordem usada na TACO)
  out = out.replace(/^ suco (.+) $/, ' $1 suco ');
  return out.trim();
}

export function normalizeQuery(text: string): string {
  return applySynonyms(normalizeText(text));
}
