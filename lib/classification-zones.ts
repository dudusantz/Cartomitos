export type ClassificationZone = {
  inicio?: number;
  fim?: number;
  posicao?: number;
  cor: string;
  texto: string;
};

export function normalizeClassificationZones(zones: unknown): ClassificationZone[] {
  if (!Array.isArray(zones)) return [];

  const ordered = [...zones].sort((a, b) => {
    const endA = Number(a?.fim ?? a?.posicao ?? 0);
    const endB = Number(b?.fim ?? b?.posicao ?? 0);
    return endA - endB;
  });

  let previousEnd = 0;
  return ordered.map((zone) => {
    const end = Math.max(1, Number(zone?.fim ?? zone?.posicao ?? 1));
    const start = Math.max(1, Math.min(end, Number(zone?.inicio ?? previousEnd + 1)));
    previousEnd = Math.max(previousEnd, end);
    return { ...zone, inicio: start, fim: end, posicao: end };
  });
}

export function findClassificationZone(zones: ClassificationZone[], position: number) {
  return normalizeClassificationZones(zones).find(
    (zone) => position >= Number(zone.inicio) && position <= Number(zone.fim),
  );
}
