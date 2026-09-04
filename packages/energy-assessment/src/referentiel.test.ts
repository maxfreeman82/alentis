import { describe, it, expect } from 'vitest';
import { ENERGY_SKILLS, ENERGY_CODES, REFERENTIEL_VERSION, CONTEXT_TAGS, findEnergySkill, type EnergyCode } from './referentiel';

describe('referentiel', () => {
  it('expose exactement 5 dimensions Energy Skills', () => {
    expect(ENERGY_SKILLS).toHaveLength(5);
    expect(ENERGY_SKILLS.map(s => s.code).sort()).toEqual(['A', 'D', 'I', 'P', 'R']);
  });

  it('chaque dimension a un nom et une définition non vides', () => {
    for (const skill of ENERGY_SKILLS) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.definition.length).toBeGreaterThan(0);
    }
  });

  it('ENERGY_CODES correspond aux codes du référentiel', () => {
    expect([...ENERGY_CODES].sort()).toEqual(['A', 'D', 'I', 'P', 'R']);
  });

  it('la version du référentiel est figée', () => {
    expect(REFERENTIEL_VERSION).toBe('ENERGY_REF_V1');
  });

  it('expose au moins 5 tags de contexte pour varier les questions', () => {
    expect(CONTEXT_TAGS.length).toBeGreaterThanOrEqual(5);
  });

  it('findEnergySkill retourne la définition correcte pour un code connu', () => {
    expect(findEnergySkill('P')).toEqual({
      code: 'P',
      name: 'Pilote',
      definition: "Donne une direction, arbitre, décide et réduit l'incertitude par l'orientation.",
    });
  });

  it('findEnergySkill lève une erreur pour un code inconnu', () => {
    expect(() => findEnergySkill('X' as EnergyCode)).toThrow('Code Energy Skill inconnu: X');
  });
});
