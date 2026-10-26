import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import { CertificateQualifications, DegreeEntryQualifications, type HigherQualification, type StudentSnapshot } from '@edulaunch/contracts';

export type EducationLevel = StudentSnapshot['educationLevel'];

interface StudentProps {
  accountId: string;
  fullName: string | null;
  educationLevel: EducationLevel | null;
  formYear: number | null;
  higherQualification: HigherQualification | null;
  streamProgramId: string | null;
  parentConsentAt: Date | null;
}

export class Student extends AggregateRoot<string, StudentProps> {
  static register(id: string, accountId: string, fullName: string | null): Student {
    return new Student(id, { accountId, fullName, educationLevel: null, formYear: null, higherQualification: null, streamProgramId: null, parentConsentAt: null });
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

  get formYear(): number | null {
    return this.props.formYear;
  }

  get higherQualification(): HigherQualification | null {
    return this.props.higherQualification;
  }

  /**
   * Form 1–3 and Form 4–5 also need the form year. After SPM the two higher levels need the qualification:
   * after certificate (Sijil, SVM or SKM) or after pre-university / diploma (STPM, matriculation, foundation,
   * A-Level, diploma, DVM or DKM). Other levels have neither.
   */
  setEducationLevel(level: EducationLevel, formYear: number | null, higherQualification: HigherQualification | null = null): void {
    const range = level === 'form1_3' ? [1, 3] : level === 'form4_5' ? [4, 5] : null;
    if (range && (formYear === null || formYear < range[0]! || formYear > range[1]!)) {
      throw new DomainError('invalid_level', `Choose a form between ${range[0]} and ${range[1]}`);
    }
    const choices: readonly string[] | null = level === 'after_certificate' ? CertificateQualifications : level === 'after_preu' ? DegreeEntryQualifications : null;
    if (choices && (higherQualification === null || !choices.includes(higherQualification))) {
      throw new DomainError('invalid_level', level === 'after_certificate' ? 'Choose a certificate, SVM or SKM' : 'Choose STPM, matriculation, foundation, A-Level, diploma, DVM or DKM');
    }
    this.props.educationLevel = level;
    this.props.formYear = range ? formYear : null;
    this.props.higherQualification = choices ? higherQualification : null;
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
