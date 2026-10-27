import { describe, expect, it } from 'vitest';

import { handle } from '../src/index';
import { isSafeInsight } from '../src/insights';
import { fakeDeps, geminiReply, INSTALL_ID, makeEnv, post } from './helpers';

const metrics = {
  days: 7,
  workoutsPlanned: 3,
  workoutsDone: 2,
  activeMinutes: 90,
  daysWithFoodLog: 5,
  avgKcal: 2010,
  avgProteinG: 95,
  avgCarbsG: 240,
  avgFatG: 70,
  targetKcal: 2200,
  targetProteinG: 120,
  avgWaterMl: 1800,
  waterGoalMl: 2400,
  weightDeltaKg: -0.4,
};

const three = [
  'Você concluiu 2 de 3 treinos.',
  'Houve registro em 5 de 7 dias.',
  'Média de 1,8 L de água.',
];

describe('POST /insights', () => {
  it('envia apenas os números e devolve 3 observações', async () => {
    const deps = fakeDeps([() => geminiReply({ insights: three })]);
    const res = await handle(
      post('/insights', { installId: INSTALL_ID, metrics }),
      makeEnv(),
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ insights: three });
    const sent = JSON.parse(deps.calls[0]!.body as string);
    expect(sent.contents[0].parts[0].text).toContain('"avgKcal":2010');
  });

  it('rejeita campos extras (ex.: dados de perfil)', async () => {
    const res = await handle(
      post('/insights', { installId: INSTALL_ID, metrics: { ...metrics, sex: 'female' } }),
      makeEnv(),
      fakeDeps([]),
    );
    expect(res.status).toBe(400);
  });

  it('descarta respostas com prescrição ou diagnóstico', async () => {
    const deps = fakeDeps([
      () => geminiReply({ insights: [...three.slice(0, 2), 'Você deve fazer dieta.'] }),
    ]);
    const res = await handle(
      post('/insights', { installId: INSTALL_ID, metrics }),
      makeEnv(),
      deps,
    );
    expect(res.status).toBe(502);
  });

  it('filtro de segurança', () => {
    expect(isSafeInsight('Seu peso variou -0,4 kg.')).toBe(true);
    expect(isSafeInsight('Recomendo cortar carboidratos')).toBe(false);
    expect(isSafeInsight('Isso pode indicar uma doença')).toBe(false);
  });
});
