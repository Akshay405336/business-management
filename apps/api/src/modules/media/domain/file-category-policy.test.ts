import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extensionForMime, policyForCategory, sniffImageMime } from './file-category-policy.js';

describe('sniffImageMime', () => {
  it('detects jpeg', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    assert.equal(sniffImageMime(buf), 'image/jpeg');
  });

  it('detects png', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    assert.equal(sniffImageMime(buf), 'image/png');
  });

  it('rejects svg-like content', () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    assert.equal(sniffImageMime(buf), null);
  });
});

describe('policyForCategory', () => {
  it('allows profile image mimes up to configured max', () => {
    const policy = policyForCategory('EMPLOYEE_PROFILE_IMAGE', 5 * 1024 * 1024);
    assert.ok(policy.allowedMimeTypes.has('image/webp'));
    assert.equal(policy.maxBytes, 5 * 1024 * 1024);
  });
});

describe('extensionForMime', () => {
  it('maps png', () => {
    assert.equal(extensionForMime('image/png'), 'png');
  });
});
