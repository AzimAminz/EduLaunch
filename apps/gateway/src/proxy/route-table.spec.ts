import { RouteTable } from './route-table.js';

const table = new RouteTable([
  { prefix: '/api/catalogue', target: 'http://catalogue' },
  { prefix: '/api/profile', target: 'http://profile' },
]);

describe('RouteTable', () => {
  it('strips the public prefix', () => {
    expect(table.resolve('/api/catalogue/programmes')).toEqual({ route: { prefix: '/api/catalogue', target: 'http://catalogue' }, upstreamPath: '/programmes' });
  });

  it('never exposes internal service-to-service routes', () => {
    expect(table.resolve('/api/profile/internal/students/1/snapshot')).toBeNull();
  });

  it('does not match a prefix that is only a partial word', () => {
    expect(table.resolve('/api/catalogue-admin/x')).toBeNull();
  });
});
