/**
 * Limits on the public contact form, which anyone can send without an account: a few messages per e-mail address a
 * day, a cap on all new messages a day (so a flood cannot bury real ones), and a hidden field that people never see
 * but form-filling bots do fill in.
 */
export const PER_EMAIL_PER_DAY = 3;
export const ALL_PER_DAY = 300;
/** Handled messages are deleted after this many days; the sender's details are not kept longer than needed. */
export const KEEP_HANDLED_DAYS = 90;

export type ContactVerdict = 'accept' | 'drop' | 'too_many_from_you' | 'too_many_today';

export function judgeContact(input: { trap: string; fromThisEmailToday: number; allToday: number }): ContactVerdict {
  // A filled trap is a bot: answer as if it worked, so it learns nothing, and store nothing.
  if (input.trap.trim()) return 'drop';
  if (input.fromThisEmailToday >= PER_EMAIL_PER_DAY) return 'too_many_from_you';
  if (input.allToday >= ALL_PER_DAY) return 'too_many_today';
  return 'accept';
}
