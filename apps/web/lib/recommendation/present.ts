/** How recommendations are shown, shared by "Cadangan saya" and the student home so the two always agree. */

/** Overall match from the score (interests, earlier study, subject strength): a house rule, tuned after testing. */
export type Match = 'strong' | 'fair' | 'weak';
export const matchOf = (score: number): Match => (score >= 80 ? 'strong' : score >= 65 ? 'fair' : 'weak');
export const MATCH_STYLE: Record<Match, { badge: string; dot: string }> = {
  strong: { badge: 'bg-[#dcf3e6] text-[#145c3b]', dot: 'bg-[#1f8a5b]' },
  fair: { badge: 'bg-[#fdf0d5] text-[#7a4f06]', dot: 'bg-[#d49a1f]' },
  weak: { badge: 'bg-[#eceef2] text-[#4a5568]', dot: 'bg-[#8a94a6]' },
};

/** Offer chance from where the student's merit stands against the programme's published average. */
export type Level = 'high' | 'medium' | 'low';
export const CHANCE_LEVEL: Record<'above' | 'near' | 'below', Level> = { above: 'high', near: 'medium', below: 'low' };
