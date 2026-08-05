import { describe, expect, it } from 'vitest';
import { isTrustedUserAction } from './TranscriptWidget';

describe('transcript widget security boundary', () => {
  it('rejects programmatic page actions', () => {
    expect(isTrustedUserAction({ nativeEvent: { isTrusted: false } })).toBe(
      false,
    );
    expect(isTrustedUserAction({ nativeEvent: { isTrusted: true } })).toBe(
      true,
    );
  });
});
