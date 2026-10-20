import { PasswordHasher } from './password-hasher.js';

const PASSPHRASE = 'a-long-test-passphrase';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('hashes with argon2id at the OWASP minimum parameters and a fresh salt each time', async () => {
    const first = await hasher.hash(PASSPHRASE);
    const [, algorithm, version, params = ''] = first.split('$');
    expect(algorithm).toBe('argon2id');
    expect(version).toBe('v=19');
    // The order of the encoded parameters differs between argon2 builds.
    expect(Object.fromEntries(params.split(',').map((pair) => pair.split('=')))).toEqual({
      m: '19456',
      t: '2',
      p: '1',
    });
    expect(first).not.toContain(PASSPHRASE);
    await expect(hasher.hash(PASSPHRASE)).resolves.not.toBe(first);
  });

  it('accepts the right password and rejects any other', async () => {
    const stored = await hasher.hash(PASSPHRASE);
    await expect(hasher.verify(stored, PASSPHRASE)).resolves.toBe(true);
    await expect(hasher.verify(stored, PASSPHRASE.toUpperCase())).resolves.toBe(false);
    await expect(hasher.verify(stored, '')).resolves.toBe(false);
  });

  it('answers false, without throwing, for unknown users and malformed hashes', async () => {
    await expect(hasher.verify(null, PASSPHRASE)).resolves.toBe(false);
    await expect(hasher.verify('not-an-argon2-hash', PASSPHRASE)).resolves.toBe(false);
  });
});
