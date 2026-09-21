import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fasesPrevistas, rodadasValidas } from './mata-mata-calendar.ts';

test('prevê todas as fases, inclusive as ainda não geradas', () => {
  assert.deepEqual(fasesPrevistas(16, [1, 2]), [1, 3, 5, 7]);
  assert.deepEqual(fasesPrevistas(0, [1, 2, 3, 4]), [1, 3]);
});

test('valida ida, volta e desempate sem impedir a regra automática', () => {
  assert.equal(rodadasValidas(28, 30, 32), true);
  assert.equal(rodadasValidas(38, null, 37), true);
  assert.equal(rodadasValidas(28, 30, null), true);
  assert.equal(rodadasValidas(28, 27, 32), false);
  assert.equal(rodadasValidas(28, 30, 30), false);
  assert.equal(rodadasValidas(0, null, null), false);
});
