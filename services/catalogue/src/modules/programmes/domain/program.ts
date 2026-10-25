import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import type { StudyLevel } from '@edulaunch/contracts';

export type PublishStatus = 'draft' | 'in_review' | 'returned' | 'published' | 'archived';

interface ProgramProps {
  institutionId: string | null;
  name: string;
  studyLevel: StudyLevel;
  durationSemesters: number | null;
  fieldIds: string[];
  publishStatus: PublishStatus;
}

export class Program extends AggregateRoot<string, ProgramProps> {
  static create(id: string, props: Omit<ProgramProps, 'publishStatus'>): Program {
    if (props.studyLevel === 'form4_stream' && props.institutionId !== null) {
      throw new DomainError('invalid_program', 'A Form 4 stream does not belong to an institution');
    }
    if (props.studyLevel !== 'form4_stream' && props.institutionId === null) {
      throw new DomainError('invalid_program', 'A programme must belong to an institution');
    }
    if (props.name.trim().length < 3) throw new DomainError('invalid_program', 'Programme name is too short');
    return new Program(id, { ...props, name: props.name.trim(), publishStatus: 'draft' });
  }

  static restore(id: string, props: ProgramProps): Program {
    return new Program(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get studyLevel(): StudyLevel {
    return this.props.studyLevel;
  }

  get isStream(): boolean {
    return this.props.studyLevel === 'form4_stream';
  }

  get isVisibleToStudents(): boolean {
    return this.props.publishStatus === 'published';
  }
}
