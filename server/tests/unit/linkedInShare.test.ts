import { describe, it, expect } from 'vitest';
import { linkedInResultFromAcceptedResponse } from '../../src/lib/socialPublish.js';

function accepted(body: string, headers?: Record<string, string>): Response {
  return new Response(body, { status: 201, headers });
}

describe('linkedInResultFromAcceptedResponse', () => {
  it('reads X-RestLi-Id when the body is empty', async () => {
    const result = await linkedInResultFromAcceptedResponse(
      accepted('', { 'X-RestLi-Id': 'urn:li:share:99' }),
    );
    expect(result.postId).toBe('urn:li:share:99');
    expect(result.postUrl).toContain(encodeURIComponent('urn:li:share:99'));
    expect(result.unverified).toBeUndefined();
  });

  it('reads a JSON id when the header is missing', async () => {
    const result = await linkedInResultFromAcceptedResponse(
      accepted(JSON.stringify({ id: 'urn:li:share:7' })),
    );
    expect(result.postId).toBe('urn:li:share:7');
    expect(result.unverified).toBeUndefined();
  });

  it('reads value.id from the body', async () => {
    const result = await linkedInResultFromAcceptedResponse(
      accepted(JSON.stringify({ value: { id: 'urn:li:ugcPost:3' } })),
    );
    expect(result.postId).toBe('urn:li:ugcPost:3');
  });

  it('does not throw on an empty 201 with no header', async () => {
    const result = await linkedInResultFromAcceptedResponse(accepted(''));
    expect(result).toEqual({
      postId: 'linkedin-unverified',
      postUrl: 'https://www.linkedin.com/feed/',
      unverified: true,
    });
  });

  it('does not throw when the 201 body is not JSON', async () => {
    const result = await linkedInResultFromAcceptedResponse(accepted('not-json'));
    expect(result.unverified).toBe(true);
    expect(result.postId).toBe('linkedin-unverified');
  });
});
