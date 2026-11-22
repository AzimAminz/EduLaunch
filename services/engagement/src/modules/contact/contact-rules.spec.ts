import { describe, expect, it } from 'vitest';
import { ALL_PER_DAY, PER_EMAIL_PER_DAY, judgeContact } from './contact-rules.js';

describe('judgeContact', () => {
  it('accepts a normal message', () => {
    expect(judgeContact({ trap: '', fromThisEmailToday: 0, allToday: 10 })).toBe('accept');
  });
  it('quietly drops what a bot sends through the hidden field', () => {
    expect(judgeContact({ trap: 'http://spam.example', fromThisEmailToday: 0, allToday: 0 })).toBe('drop');
  });
  it('limits messages per address and per day', () => {
    expect(judgeContact({ trap: '', fromThisEmailToday: PER_EMAIL_PER_DAY, allToday: 0 })).toBe('too_many_from_you');
    expect(judgeContact({ trap: '', fromThisEmailToday: 0, allToday: ALL_PER_DAY })).toBe('too_many_today');
  });
});
