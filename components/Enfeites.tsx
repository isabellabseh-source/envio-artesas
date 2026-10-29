/** Decorative drawings matching the brand: glossy hearts, a ribbon bow and a stitched heart line. */

const HEART = 'M50 88C22 68 6 52 6 32 6 18 17 8 30 8c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 24 0 20-16 36-44 56z';

export function Coracao({ cor = 'rosa', tamanho = 40, className = '' }: { cor?: 'rosa' | 'azul'; tamanho?: number; className?: string }) {
  const [claro, escuro] = cor === 'rosa' ? ['#ffc2cc', '#f08a9c'] : ['#d6ebf8', '#93bfdf'];
  const id = `cor-${cor}`;
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 100 96" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor={claro} />
          <stop offset="1" stopColor={escuro} />
        </radialGradient>
      </defs>
      <path d={HEART} fill={`url(#${id})`} />
      <ellipse cx="30" cy="26" rx="10" ry="6" fill="#fff" opacity="0.65" transform="rotate(-30 30 26)" />
    </svg>
  );
}

export function Laco({ largura = 96 }: { largura?: number }) {
  return (
    <svg width={largura} height={largura * 0.7} viewBox="0 0 120 84" aria-hidden="true">
      <g stroke="#e07a8e" strokeWidth="1.5" strokeDasharray="3 3" fill="#f6a3b2">
        <path d="M60 34C44 14 14 6 8 18c-6 12 10 30 52 22z" />
        <path d="M60 34C76 14 106 6 112 18c6 12-10 30-52 22z" />
        <path d="M54 40 34 78l12-3 6 9 8-40z" />
        <path d="M66 40l20 38-12-3-6 9-8-40z" />
      </g>
      <rect x="50" y="28" width="20" height="18" rx="7" fill="#f28fa1" />
      <ellipse cx="24" cy="18" rx="9" ry="4" fill="#fff" opacity="0.5" transform="rotate(-15 24 18)" />
    </svg>
  );
}

/** A dashed line that loops into a heart, used as a divider. */
export function LinhaCoracao({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M4 30C60 30 110 10 150 24c12-14 34-10 30 6-3 10-20 10-30-6 30 12 80 6 166 2"
        fill="none"
        stroke="#ef9aab"
        strokeWidth="2"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
    </svg>
  );
}
