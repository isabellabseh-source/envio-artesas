import { redirect } from 'next/navigation';

/** Old e-mail notices pointed to /admin/<id>; the content page now lives under Envio de conteúdo. */
export default async function Antigo({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/admin/envios/${(await params).id}`);
}
