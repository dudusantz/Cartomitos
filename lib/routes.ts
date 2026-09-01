export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function teamPath(team: { id: number; nome?: string | null; slug?: string | null }) {
  const slug = slugify(team.slug || team.nome || "time");
  return `/times/${slug}-${team.id}`;
}

export function parseTrailingId(value: string) {
  const match = value.match(/(?:^|-)(\d+)$/);
  return match ? Number(match[1]) : Number.NaN;
}
