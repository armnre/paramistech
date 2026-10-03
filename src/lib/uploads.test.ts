import { describe, expect, it } from 'vitest';
import { detectImageType } from './image-signature';

describe('upload magic bytes', () => {
  it('accepts png, jpeg, and webp signatures', () => {
    expect(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('image/png');
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it('rejects svg and other disguised files', () => {
    expect(detectImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(Uint8Array.from([0, 1, 2, 3]))).toBeNull();
  });
});
