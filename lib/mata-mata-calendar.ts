export function fasesPrevistas(participantes: number, rodadasExistentes: number[]) {
  const total = Math.max(
    Math.ceil(Math.log2(Math.max(1, participantes))),
    ...rodadasExistentes.map((rodada) => Math.ceil(rodada / 2)),
    0,
  );
  return Array.from({ length: total }, (_, indice) => indice * 2 + 1);
}

export function rodadasValidas(ida: number, volta: number | null, desempate: number | null) {
  const valida = (valor: number) => Number.isInteger(valor) && valor >= 1 && valor <= 38;
  return valida(ida) &&
    (volta === null || (valida(volta) && volta > ida)) &&
    (desempate === null || (valida(desempate) && desempate !== ida && desempate !== volta));
}
