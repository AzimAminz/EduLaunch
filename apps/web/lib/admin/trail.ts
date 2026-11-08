/**
 * Where an admin came from, so going back lands on the same list, page, sort and filters.
 *
 * A link from a list to an object carries the list's address as `?dari=…`. Pages below it (a programme's
 * requirement, its edit page) pass the same `dari` on, so every level of the breadcrumb can return to it.
 * Only addresses inside the admin console are accepted.
 */
export interface Crumb {
  label: string;
  href: string;
}

type Raw = string | string[] | undefined;

/** The `dari` address when it is a safe admin path, otherwise null. */
export function readFrom(raw: Raw, locale: string): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value.length > 600 || value.includes('//') || value.includes('\\')) return null;
  return value === `/${locale}/admin` || value.startsWith(`/${locale}/admin/`) || value.startsWith(`/${locale}/admin?`) ? value : null;
}

/** `href` with `dari` added (or nothing added when there is no `from`). */
export function withFrom(href: string, from: string | null | undefined): string {
  if (!from) return href;
  return `${href}${href.includes('?') ? '&' : '?'}dari=${encodeURIComponent(from)}`;
}

const pathOf = (href: string) => href.split('?')[0]!;

/**
 * The breadcrumb above an object's title. The first crumb is the list the admin came from (the inbox, the
 * programme list, home); otherwise the catalogue's own order: institutions, then the institution.
 */
export function trail({
  locale,
  from,
  labels,
  institution,
}: {
  locale: string;
  from: string | null;
  labels: { home: string; tasks: string; institutions: string; programmes: string };
  institution?: { id: string; name: string } | null;
}): Crumb[] {
  const admin = `/${locale}/admin`;
  const at = from ? pathOf(from) : null;
  if (from && at === admin) return [{ label: labels.home, href: from }];
  if (from && at === `${admin}/tugasan`) return [{ label: labels.tasks, href: from }];
  if (from && at === `${admin}/program`) return [{ label: labels.programmes, href: from }];
  if (!institution) return [{ label: labels.programmes, href: `${admin}/program` }];
  const crumbs: Crumb[] = [{ label: labels.institutions, href: from && at === `${admin}/institusi` ? from : `${admin}/institusi` }];
  const own = `${admin}/institusi/${institution.id}`;
  crumbs.push({ label: institution.name, href: from && at === own ? from : `${own}?tab=program` });
  return crumbs;
}
