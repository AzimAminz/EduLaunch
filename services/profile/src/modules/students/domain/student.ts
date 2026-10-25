import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import type { StudentSnapshot } from '@edulaunch/contracts';

export type EducationLevel = StudentSnapshot['educationLevel'];

interface StudentProps {
  accountId: string;
  fullName: string | null;
  educationLevel: EducationLevel | null;
  formYear: number | null;
  streamProgramId: string | null;
  parentConsentAt: Date | null;
}

export class Student extends AggregateRoot<string, StudentProps> {
  static register(id: string, accountId: string, fullName: string | null): Student {
    return new Student(id, { accountId, fullName, educationLevel: null, formYear: null, streamProgramId: null, parentConsentAt: null });
  }

  static restore(id: string, props: StudentProps): Student {
    return new Student(id, props);
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get educationLevel(): EducationLevel | null {
    return this.props.educationLevel;
  }

  /** Form 1–3 and Form 4–5 also need the form year; other levels must not have one. */
  setEducationLevel(level: EducationLevel, formYear: number | null): void {
    const range = level === 'form1_3' ? [1, 3] : level === 'form4_5' ? [4, 5] : null;
    if (range && (formYear === null || formYear < range[0]! || formYear > range[1]!)) {
      throw new DomainError('invalid_level', `Choose a form between ${range[0]} and ${range[1]}`);
    }
    this.props.educationLevel = level;
    this.props.formYear = range ? formYear : null;
    if (level !== 'form4_5') this.props.streamProgramId = null;
  }

  chooseStream(streamProgramId: string): void {
    if (this.props.educationLevel !== 'form4_5' && this.props.educationLevel !== 'form1_3') {
      throw new DomainError('invalid_level', 'Streams apply to Form 1–5 students only');
    }
    this.props.streamProgramId = streamProgramId;
  }

  recordParentConsent(): void {
    this.props.parentConsentAt = new Date();
  }
}
