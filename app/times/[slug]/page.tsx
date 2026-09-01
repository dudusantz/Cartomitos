import { notFound } from "next/navigation";
import { buscarPerfilPublicoTime } from "@/app/actions";
import PerfilPublicoTime from "@/app/components/public/PerfilPublicoTime";
import { parseTrailingId } from "@/lib/routes";

export default async function TimePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const timeId = parseTrailingId(slug);
  if (!Number.isInteger(timeId)) notFound();

  const profile = await buscarPerfilPublicoTime(timeId);
  if (!profile) notFound();

  return <PerfilPublicoTime time={profile.time} partidas={profile.partidas} erroPartidas={profile.erroPartidas} />;
}
