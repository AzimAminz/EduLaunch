import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import { InstitutionTypes, type InstitutionType } from '@edulaunch/contracts';

export interface InstitutionDetails {
  name: string;
  shortName: string | null;
  type: string;
  websiteUrl: string | null;
}

interface InstitutionProps extends InstitutionDetails {
  type: InstitutionType;
}

/** A university, polytechnic or college that offers programmes. Reference data: admins edit it directly. */
export class Institution extends AggregateRoot<string, InstitutionProps> {
  static create(id: string, details: InstitutionDetails): Institution {
    return new Institution(id, Institution.validated(details));
  }

  static restore(id: string, props: InstitutionProps): Institution {
    return new Institution(id, props);
  }

  update(details: InstitutionDetails): void {
    this.props = Institution.validated(details);
  }

  private static validated(d: InstitutionDetails): InstitutionProps {
    const name = d.name.trim();
    if (name.length < 3 || name.length > 160) throw new DomainError('invalid_institution', 'Name must be 3 to 160 characters');
    const shortName = d.shortName?.trim() || null;
    if (shortName && shortName.length > 20) throw new DomainError('invalid_institution', 'Short name must be at most 20 characters');
    if (!(InstitutionTypes as readonly string[]).includes(d.type)) throw new DomainError('invalid_institution', `Unknown institution type ${d.type}`);
    const websiteUrl = d.websiteUrl?.trim() || null;
    if (websiteUrl && (!/^https?:\/\/\S+$/.test(websiteUrl) || websiteUrl.length > 300)) {
      throw new DomainError('invalid_source', 'The website must be a web link (https://…)');
    }
    return { name, shortName, type: d.type as InstitutionType, websiteUrl };
  }
}
