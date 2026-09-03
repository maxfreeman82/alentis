import { describe, it, expect } from 'vitest';
import { validateGeneratedQuestion } from './validation';

const signals = { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' } as const;

describe('validateGeneratedQuestion', () => {
  it('accepte une réponse IA conforme au contrat', () => {
    const raw = {
      question_text: 'Votre équipe hésite sur la suite à donner. Que faites-vous en premier ?',
      question_format: 'forced_choice',
      options: [
        { key: 'opt_P', text: 'Je propose une direction claire.' },
        { key: 'opt_I', text: "J'explore une autre approche possible." },
        { key: 'opt_D', text: "Je réunis l'équipe pour trancher ensemble." },
        { key: 'opt_A', text: 'Je lance une première action concrète.' },
        { key: 'opt_R', text: "J'analyse les risques avant d'agir." },
      ],
    };
    const result = validateGeneratedQuestion(raw, signals);
    expect(result).not.toBeNull();
    expect(result?.options).toHaveLength(5);
  });

  it('rejette une réponse avec une clé d\'option manquante', () => {
    const raw = {
      question_text: 'Question incomplète',
      question_format: 'forced_choice',
      options: [{ key: 'opt_P', text: 'Direction.' }],
    };
    expect(validateGeneratedQuestion(raw, signals)).toBeNull();
  });

  it('rejette une réponse avec une clé d\'option inconnue', () => {
    const raw = {
      question_text: 'Question',
      question_format: 'arbitration',
      options: [{ key: 'opt_X', text: 'Invalide.' }, { key: 'opt_P', text: 'Direction.' }],
    };
    expect(validateGeneratedQuestion(raw, { opt_1: 'P', opt_2: 'A' })).toBeNull();
  });

  it('rejette un texte de question vide', () => {
    const raw = { question_text: '', question_format: 'forced_choice', options: [] };
    expect(validateGeneratedQuestion(raw, signals)).toBeNull();
  });
});
