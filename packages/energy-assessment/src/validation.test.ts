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

  it('rejette un texte de question composé uniquement d\'espaces', () => {
    const raw = {
      question_text: '   ',
      question_format: 'forced_choice',
      options: [
        { key: 'opt_P', text: 'Direction.' },
        { key: 'opt_I', text: 'Exploration.' },
        { key: 'opt_D', text: 'Mobilisation.' },
        { key: 'opt_A', text: 'Action.' },
        { key: 'opt_R', text: 'Analyse.' },
      ],
    };
    expect(validateGeneratedQuestion(raw, signals)).toBeNull();
  });

  it('rejette un texte d\'option composé uniquement d\'espaces', () => {
    const raw = {
      question_text: 'Question valide ?',
      question_format: 'arbitration',
      options: [
        { key: 'opt_1', text: '  ' },
        { key: 'opt_2', text: 'Analyse les risques.' },
      ],
    };
    expect(validateGeneratedQuestion(raw, { opt_1: 'P', opt_2: 'R' })).toBeNull();
  });

  it('ignore le question_format annoncé par l\'IA et le déduit du nombre d\'options réel', () => {
    // L'IA prétend à tort qu'il s'agit d'un choix forcé à 5 options, alors que
    // le contrat imposé par le moteur (2 clés) est une arbitration. Le champ
    // question_format renvoyé doit refléter le contrat, pas la déclaration IA.
    const raw = {
      question_text: 'Entre ces deux options, laquelle choisissez-vous ?',
      question_format: 'forced_choice',
      options: [
        { key: 'opt_1', text: 'Je tranche rapidement.' },
        { key: 'opt_2', text: "J'attends d'en savoir plus." },
      ],
    };
    const result = validateGeneratedQuestion(raw, { opt_1: 'P', opt_2: 'R' });
    expect(result).not.toBeNull();
    expect(result?.questionFormat).toBe('arbitration');
  });
});
