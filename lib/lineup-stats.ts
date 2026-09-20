export type EscalacaoRodada = {
  atletas: { atleta_id: number; apelido: string; clube_id: number; posicao_id: number; foto?: string }[];
};

export function resumirEscalacoes(escalacoes: EscalacaoRodada[], clubes: Record<string, { nome_fantasia?: string; nome?: string; abreviacao?: string; slug?: string; escudos?: Record<string, string> }>) {
  const esquemas = new Map<string, number>();
  const atletas = new Map<number, { nome: string; jogos: number; foto?: string; posicao: number; clubeId: number }>();
  const clubesUsados = new Map<number, { nome: string; escudo?: string; escolhas: number }>();

  for (const escalacao of escalacoes) {
    const titulares = escalacao.atletas || [];
    if (!titulares.length) continue;
    const porPosicao = (id: number) => titulares.filter((atleta) => atleta.posicao_id === id).length;
    const esquema = `${porPosicao(2) + porPosicao(3)}-${porPosicao(4)}-${porPosicao(5)}`;
    esquemas.set(esquema, (esquemas.get(esquema) || 0) + 1);

    for (const atleta of titulares) {
      if (!atleta.atleta_id || atleta.posicao_id === 6) continue;
      const anterior = atletas.get(atleta.atleta_id);
      atletas.set(atleta.atleta_id, {
        nome: atleta.apelido || anterior?.nome || `Atleta ${atleta.atleta_id}`,
        jogos: (anterior?.jogos || 0) + 1,
        // A API frequentemente devolve a silhueta do uniforme, não uma foto do atleta.
        foto: atleta.foto && !atleta.foto.includes('/silhuetas/') ? atleta.foto.replace('FORMATO', '140x140') : anterior?.foto,
        posicao: atleta.posicao_id,
        clubeId: atleta.clube_id,
      });
      if (!atleta.clube_id) continue;
      const clube = clubes[String(atleta.clube_id)];
      const clubeAnterior = clubesUsados.get(atleta.clube_id);
      clubesUsados.set(atleta.clube_id, {
        nome: clube?.nome_fantasia || clube?.nome || clubeAnterior?.nome || `Clube ${atleta.clube_id}`,
        escudo: clube?.escudos?.['60x60'] || clubeAnterior?.escudo,
        escolhas: (clubeAnterior?.escolhas || 0) + 1,
      });
    }
  }

  return {
    rodadas: escalacoes.filter((escalacao) => escalacao.atletas?.length).length,
    totalEscolhas: [...clubesUsados.values()].reduce((total, clube) => total + clube.escolhas, 0),
    jogadoresDiferentes: atletas.size,
    clubesDiferentes: clubesUsados.size,
    esquemas: [...esquemas].map(([nome, jogos]) => ({ nome, jogos })).sort((a, b) => b.jogos - a.jogos || a.nome.localeCompare(b.nome)).slice(0, 5),
    atletas: [...atletas.values()].map((atleta) => {
      const clube = clubes[String(atleta.clubeId)];
      return {
        ...atleta,
        clube: clube?.slug ? clube.slug.split('-').map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1)).join(' ') : clube?.nome_fantasia || clube?.nome || clube?.abreviacao || '',
        escudoClube: clube?.escudos?.['60x60'],
      };
    }).sort((a, b) => b.jogos - a.jogos || a.nome.localeCompare(b.nome)).slice(0, 8),
    clubes: [...clubesUsados.values()].sort((a, b) => b.escolhas - a.escolhas || a.nome.localeCompare(b.nome)).slice(0, 8),
  };
}
