import { describe, expect, it } from 'vitest';
import { requirementSlots } from './requirement-slots';

const cat = (category: string, route: string | null, text: string) => ({ jenprog: 'stpm', category, route, generalRequirements: text });
const v = (entryRoute: string, sourceCategory: string | null, id = `${entryRoute}-${sourceCategory}`) => ({ id, entryRoute, sourceCategory });
const ORDER = ['spm', 'stpm', 'matrikulasi', 'diploma'];

describe('requirementSlots', () => {
  it('gives categories with the same text one slot, and different texts one each', () => {
    const slots = requirementSlots(ORDER, [cat('S', 'stpm', 'A'), cat('A', 'stpm', 'A'), cat('G1', 'diploma', 'X'), cat('G2', 'diploma', 'Y')], [], []);
    expect(slots.map((s) => [s.route, s.category, s.categories])).toEqual([
      ['stpm', 'stpm:S', ['stpm:S', 'stpm:A']],
      ['diploma', 'stpm:G1', ['stpm:G1']],
      ['diploma', 'stpm:G2', ['stpm:G2']],
    ]);
  });

  it('puts each version in the slot of its category, keeping the category it was written under', () => {
    const slots = requirementSlots(ORDER, [cat('S', 'stpm', 'A'), cat('A', 'stpm', 'A')], [], [v('stpm', 'stpm:A')]);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ category: 'stpm:A', versions: [{ id: 'stpm-stpm:A' }] });
  });

  it('keeps requirements written without ePanduan, in route order', () => {
    const slots = requirementSlots(ORDER, [cat('S', 'stpm', 'A')], [], [v('spm', null), v('stpm', null)]);
    expect(slots.map((s) => [s.route, s.category, s.group ? 'epanduan' : 'own'])).toEqual([
      ['spm', null, 'own'],
      ['stpm', 'stpm:S', 'epanduan'],
      ['stpm', null, 'own'],
    ]);
  });
});
