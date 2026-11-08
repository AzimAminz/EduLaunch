import { groupCategories, type CategoryGroup } from './epanduan-text';

/**
 * Where a programme's requirements go, one slot per requirement: for each route, one per group of ePanduan candidate
 * categories with the same text (STPM Sains and STPM Sastera share a slot when ePanduan lists the same requirements,
 * and get one each when they differ), plus one for requirements written without ePanduan.
 */
export interface RequirementSlot<V> {
  key: string;
  route: string;
  /** The ePanduan categories and text the slot is written from; null when written without ePanduan. */
  group: CategoryGroup | null;
  /** The category the requirement is stored under (`jenprog:category`), null when there is none. */
  category: string | null;
  /** Every category the slot covers. */
  categories: string[];
  /** Its requirement versions, newest first as given. */
  versions: V[];
}

type Category = Parameters<typeof groupCategories>[0][number];
type Special = Parameters<typeof groupCategories>[1][number];

export const categoryKey = (c: { jenprog: string; category: string }) => `${c.jenprog}:${c.category}`;

export function requirementSlots<V extends { entryRoute: string; sourceCategory: string | null }>(
  routeOrder: readonly string[],
  categories: Category[],
  special: Special[],
  versions: V[],
): RequirementSlot<V>[] {
  const slots: RequirementSlot<V>[] = [];
  for (const route of routeOrder) {
    const own = versions.filter((v) => v.entryRoute === route);
    const placed = new Set<V>();
    for (const group of groupCategories(
      categories.filter((c) => c.route === route),
      special,
    )) {
      const keys = group.categories.map(categoryKey);
      const mine = own.filter((v) => v.sourceCategory !== null && keys.includes(v.sourceCategory));
      mine.forEach((v) => placed.add(v));
      // A requirement already written under one of the group's categories keeps that category.
      const category = mine[0]?.sourceCategory ?? keys[0]!;
      slots.push({ key: `${route}|${category}`, route, group, category, categories: keys, versions: mine });
    }
    // Written without ePanduan, or under a category ePanduan no longer lists: one slot per stored category.
    const rest = own.filter((v) => !placed.has(v));
    for (const category of [...new Set(rest.map((v) => v.sourceCategory))]) {
      slots.push({ key: `${route}|${category ?? ''}`, route, group: null, category, categories: category ? [category] : [], versions: rest.filter((v) => v.sourceCategory === category) });
    }
  }
  return slots;
}
