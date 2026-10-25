/** Public URL prefix → internal service. `/internal/*` paths are never routed. */
export interface Route {
  prefix: string;
  target: string;
  /** Public GET responses that can be cached briefly (catalogue browsing). */
  cacheSeconds?: number;
}

export class RouteTable {
  constructor(private readonly routes: Route[]) {}

  resolve(path: string): { route: Route; upstreamPath: string } | null {
    if (/(^|\/)internal(\/|$)/.test(path)) return null;
    for (const route of this.routes) {
      if (path === route.prefix || path.startsWith(`${route.prefix}/`)) {
        return { route, upstreamPath: path.slice(route.prefix.length) || '/' };
      }
    }
    return null;
  }
}
