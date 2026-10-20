import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/** OWASP Password Storage Cheat Sheet minimum for argon2id: 19 MiB, 2 iterations, 1 lane. */
const OPTIONS = { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/** argon2id password hashing. */
@Injectable()
export class PasswordHasher {
  /** A real hash to verify against when the email is unknown, so both paths take the same time. */
  private readonly dummyHash = hash('timing-equaliser-not-a-password', OPTIONS);

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string | null, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash ?? (await this.dummyHash), password);
    } catch {
      return false;
    }
  }
}
