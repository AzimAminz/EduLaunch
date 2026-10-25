import type { Student } from './student.js';

export abstract class StudentRepository {
  abstract findById(id: string): Promise<Student | null>;
  abstract findByAccountId(accountId: string): Promise<Student | null>;
  /** Creates the account row too, on first sign-in. */
  abstract save(student: Student): Promise<void>;
  abstract latestRiasec(studentId: string): Promise<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number> | null>;
}
