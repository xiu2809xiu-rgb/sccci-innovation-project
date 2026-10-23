import { Zip, ZipDeflate, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { inflatedBytes } from './inflated-bytes.js';

const MEGABYTE = 1_000_000;

/** An archive written as a stream: its sizes come after the data, in data descriptors. */
function streamedZip(name: string, content: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  const zip = new Zip((_error, chunk) => {
    parts.push(chunk);
  });
  const entry = new ZipDeflate(name, { level: 6 });
  zip.add(entry);
  entry.push(content, true);
  zip.end();
  return Buffer.concat(parts);
}

/** The archive with every size its central directory declares replaced by `size`. */
function understated(archive: Uint8Array, size: number): Uint8Array {
  const copy = Buffer.from(archive);
  for (let at = copy.length - 46; at >= 0; at -= 1) {
    if (copy.readUInt32LE(at) === 0x02014b50) copy.writeUInt32LE(size, at + 24);
  }
  return copy;
}

describe('inflatedBytes', () => {
  it('counts what every entry really unpacks to', () => {
    const archive = zipSync({
      'sheet.xml': new Uint8Array(1500),
      'styles.xml': new Uint8Array(500),
    });
    expect(inflatedBytes(archive, MEGABYTE)).toBe(2000);
  });

  it('stops counting soon after the limit, however small the archive', () => {
    const bomb = zipSync({ 'sheet.xml': new Uint8Array(30 * MEGABYTE) });
    expect(bomb.length).toBeLessThan(50_000);
    const counted = inflatedBytes(bomb, MEGABYTE) ?? 0;
    expect(counted).toBeGreaterThan(MEGABYTE);
    expect(counted).toBeLessThan(30 * MEGABYTE);
  });

  it('does not believe a central directory that understates the sizes', () => {
    const lying = understated(zipSync({ 'sheet.xml': new Uint8Array(5 * MEGABYTE) }), 1000);
    expect(inflatedBytes(lying, MEGABYTE)).toBeGreaterThan(MEGABYTE);
  });

  it('counts an entry whose sizes come after its data', () => {
    const streamed = streamedZip('sheet.xml', new Uint8Array(5 * MEGABYTE));
    expect(Buffer.from(streamed).readUInt16LE(6) & 0x08).toBe(0x08);
    expect(inflatedBytes(streamed, MEGABYTE)).toBeGreaterThan(MEGABYTE);
    expect(inflatedBytes(streamed, 10 * MEGABYTE)).toBe(5 * MEGABYTE);
  });

  it('cannot read bytes that are no zip archive', () => {
    const fake = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(40, 0xff)]);
    expect(inflatedBytes(fake, MEGABYTE)).toBeNull();
  });
});
