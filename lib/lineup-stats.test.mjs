import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resumirEscalacoes } from './lineup-stats.ts';

test('conta titulares, esquemas e clubes por rodada', () => {
  const rodadas = [
    { atletas: [
      { atleta_id: 1, apelido: 'A', clube_id: 10, posicao_id: 2, foto: 'https://example.com/silhuetas/A/FORMATO.png' },
      { atleta_id: 2, apelido: 'B', clube_id: 10, posicao_id: 3 },
      { atleta_id: 3, apelido: 'C', clube_id: 20, posicao_id: 4 },
      { atleta_id: 4, apelido: 'D', clube_id: 20, posicao_id: 5 },
      { atleta_id: 6, apelido: 'Técnico', clube_id: 20, posicao_id: 6 },
    ] },
    { atletas: [
      { atleta_id: 1, apelido: 'A', clube_id: 10, posicao_id: 2 },
      { atleta_id: 5, apelido: 'E', clube_id: 20, posicao_id: 3 },
      { atleta_id: 3, apelido: 'C', clube_id: 20, posicao_id: 4 },
      { atleta_id: 4, apelido: 'D', clube_id: 20, posicao_id: 5 },
      { atleta_id: 6, apelido: 'Técnico', clube_id: 20, posicao_id: 6 },
    ] },
  ];
  const resumo = resumirEscalacoes(rodadas, { 10: { nome_fantasia: 'Clube A', slug: 'clube-a', escudos: { '60x60': 'https://example.com/a.png' } }, 20: { nome_fantasia: 'Clube B' } });
  assert.equal(resumo.rodadas, 2);
  assert.deepEqual(resumo.esquemas, [{ nome: '2-1-1', jogos: 2 }]);
  assert.deepEqual(resumo.atletas[0], { nome: 'A', jogos: 2, foto: undefined, posicao: 2, clubeId: 10, clube: 'Clube A', escudoClube: 'https://example.com/a.png' });
  assert.equal(resumo.totalEscolhas, 8);
  assert.equal(resumo.jogadoresDiferentes, 5);
  assert.deepEqual(resumo.clubes[0], { nome: 'Clube B', escudo: undefined, escolhas: 5 });
});

test('usa foto real quando disponível, sem confundir silhueta com retrato', () => {
  const resumo = resumirEscalacoes([
    { atletas: [{ atleta_id: 9, apelido: 'Atleta', clube_id: 10, posicao_id: 4, foto: 'https://example.com/silhuetas/PAL/FORMATO.png' }] },
    { atletas: [{ atleta_id: 9, apelido: 'Atleta', clube_id: 10, posicao_id: 4, foto: 'https://example.com/atletas/FORMATO.png' }] },
  ], { 10: { slug: 'palmeiras', escudos: { '60x60': 'https://example.com/pal.png' } } });
  assert.equal(resumo.atletas[0].foto, 'https://example.com/atletas/140x140.png');
  assert.equal(resumo.atletas[0].clube, 'Palmeiras');
  assert.equal(resumo.atletas[0].escudoClube, 'https://example.com/pal.png');
});
