import type { Metadata, Viewport } from 'next';
import './globals.css';

const descricao = 'Envie as fotos, os produtos e as informações do seu catálogo num só lugar.';

export const metadata: Metadata = {
  // Netlify sets URL during the build; link previews need an absolute image address.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'https://envio-isa.netlify.app'),
  title: 'Envio de conteúdo do site',
  description: descricao,
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Vamos montar o site do seu ateliê!',
    description: descricao,
    siteName: 'Isa Barros Ateliê',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: '/capa.jpg', width: 1200, height: 630, alt: 'Isa Barros Ateliê: vamos montar o site do seu ateliê' }],
  },
  twitter: { card: 'summary_large_image', images: ['/capa.jpg'] },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ee8a9c' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
