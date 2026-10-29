import 'server-only';
import { headers } from 'next/headers';

/**
 * The system's public address: NEXT_PUBLIC_SITE_URL if set, then the main address Netlify provides (URL),
 * otherwise the address the page was opened at.
 */
export async function enderecoBase() {
  const fixo = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  if (fixo) return fixo.replace(/\/$/, '');
  const h = await headers();
  // Netlify deploy previews look like "<deploy id>--site.netlify.app"; links must point to the main site.
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000').replace(/^[0-9a-f]{24}--/, '');
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
