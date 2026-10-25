import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Caller } from '@edulaunch/nest-kit';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';

interface SupabaseClaims extends JWTPayload {
  role?: string;
  app_metadata?: { role?: string };
}

/**
 * Verifies Supabase access tokens.
 * Asymmetric keys (cloud default) are checked against the project's JWKS; HS256 (local CLI) uses the shared secret.
 * The admin role comes from `app_metadata.role`, which only the service key can set — users cannot grant it to themselves.
 */
@Injectable()
export class JwtVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly secret?: Uint8Array;
  private readonly issuer: string;

  constructor(supabaseUrl: string, hsSecret?: string) {
    this.issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    if (hsSecret) this.secret = new TextEncoder().encode(hsSecret);
  }

  async verify(token: string): Promise<Caller> {
    try {
      const { payload } = await this.verifySignature(token);

      if (!payload.sub || payload.role !== 'authenticated') throw new Error('Not a signed-in user token');
      return { userId: payload.sub, role: payload.app_metadata?.role === 'admin' ? 'admin' : 'student' };
    } catch (err) {
      throw new UnauthorizedException(err instanceof Error ? `Invalid session: ${err.message}` : 'Invalid session');
    }
  }

  private verifySignature(token: string) {
    const options = { issuer: this.issuer, audience: 'authenticated' };
    if (decodeProtectedHeader(token).alg !== 'HS256') return jwtVerify<SupabaseClaims>(token, this.jwks, options);
    if (!this.secret) throw new Error('HS256 tokens are not accepted without SUPABASE_JWT_SECRET');
    return jwtVerify<SupabaseClaims>(token, this.secret, { ...options, algorithms: ['HS256'] });
  }
}
