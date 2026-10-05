import { describe, it, expect } from 'vitest';
import { validateAdaptiveQuestion } from './validation';

const keys = ['k1', 'k2', 'k3', 'k4'];
const valid = {
  question_text: 'Votre client apprend un retard de livraison…',
  options: [
    { key: 'k3', text: 'C' }, { key: 'k1', text: 'A' },
    { key: 'k4', text: 'D' }, { key: 'k2', text: 'B' },
  ],
};

describe('validateAdaptiveQuestion', () => {
  it('accepte une sortie conforme et remet les options dans l\'ordre des clés', () => {
    const q = validateAdaptiveQuestion(valid, keys);
    expect(q?.options.map(o => o.key)).toEqual(keys);
    expect(q?.options[0]?.text).toBe('A');
    expect(q?.questionText).toBe(valid.question_text);
  });

  it('rejette un champ en trop (ex. une valeur inventée)', () => {
    expect(validateAdaptiveQuestion({ ...valid, best: 'k1' }, keys)).toBeNull();
    const smuggled = { ...valid, options: valid.options.map(o => ({ ...o, value: 1 })) };
    expect(validateAdaptiveQuestion(smuggled, keys)).toBeNull();
  });

  it('rejette une clé manquante, en trop ou dupliquée', () => {
    expect(validateAdaptiveQuestion({ ...valid, options: valid.options.slice(0, 3) }, keys)).toBeNull();
    expect(validateAdaptiveQuestion({ ...valid, options: [...valid.options, { key: 'k5', text: 'E' }] }, keys)).toBeNull();
    const dup = { ...valid, options: [...valid.options.slice(0, 3), { key: 'k1', text: 'X' }] };
    expect(validateAdaptiveQuestion(dup, keys)).toBeNull();
  });

  it('rejette un texte vide', () => {
    expect(validateAdaptiveQuestion({ ...valid, question_text: '  ' }, keys)).toBeNull();
  });

  it('rejette une entrée non objet', () => {
    expect(validateAdaptiveQuestion('{}', keys)).toBeNull();
    expect(validateAdaptiveQuestion(null, keys)).toBeNull();
  });
});
