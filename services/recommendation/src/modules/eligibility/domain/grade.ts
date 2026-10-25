import { DomainError, ValueObject } from '@edulaunch/ddd';
import { GradeScales, type Qualification } from '@edulaunch/contracts';

/** A grade on a known scale. Lower rank = better (A+ is rank 0 on SPM). */
export class Grade extends ValueObject<{ qualification: Qualification; letter: string }> {
  static of(qualification: Qualification, letter: string): Grade {
    const normalised = letter.trim().toUpperCase();
    if (!(GradeScales[qualification] as readonly string[]).includes(normalised)) {
      throw new DomainError('invalid_grade', `"${letter}" is not a ${qualification.toUpperCase()} grade`);
    }
    return new Grade({ qualification, letter: normalised });
  }

  get letter(): string {
    return this.props.letter;
  }

  get rank(): number {
    return (GradeScales[this.props.qualification] as readonly string[]).indexOf(this.props.letter);
  }

  meets(minimum: Grade): boolean {
    return this.rank <= minimum.rank;
  }

  /** How many grade steps short of the minimum (0 when it meets it). */
  stepsShortOf(minimum: Grade): number {
    return Math.max(0, this.rank - minimum.rank);
  }

  /** 0–1, where the best grade is 1 and the worst is 0. */
  get normalised(): number {
    const size = GradeScales[this.props.qualification].length;
    return 1 - this.rank / (size - 1);
  }
}
