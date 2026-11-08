'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONES: Record<string, React.ReactNode> = {
  '/admin': <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z" />,
  '/admin/artesas': (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  '/admin/pedidos': <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  '/admin/agenda': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  '/admin/envios': <path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  '/admin/financeiro': (
    <>
      <rect x="2" y="6" width="20" height="13" rx="3" />
      <circle cx="12" cy="12.5" r="2.5" />
      <path d="M6 10v5M18 10v5" />
    </>
  ),
  '/admin/configuracoes': (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

const ITENS: [string, string][] = [
  ['/admin', 'Dashboard'],
  ['/admin/artesas', 'Artesãs'],
  ['/admin/pedidos', 'Pedidos'],
  ['/admin/agenda', 'Agenda'],
  ['/admin/envios', 'Envio de conteúdo'],
  ['/admin/financeiro', 'Financeiro'],
  ['/admin/configuracoes', 'Configurações'],
];

export default function Menu({ alertas }: { alertas: number }) {
  const atual = usePathname();
  return (
    <nav aria-label="Menu principal">
      {ITENS.map(([href, nome]) => {
        const ativo = href === '/admin' ? atual === '/admin' : atual.startsWith(href);
        return (
          <Link key={href} href={href} className={ativo ? 'ativo' : ''} aria-current={ativo ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONES[href]}
            </svg>
            {nome}
            {href === '/admin' && alertas > 0 && <span className="contagem">{alertas}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
