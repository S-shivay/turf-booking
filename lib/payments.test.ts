import { describe, expect, it } from 'vitest';
import { allAttemptsFailed, findUsablePayment } from './payments';

const at = (...statuses: string[]) => statuses.map((status) => ({ status }));

describe('allAttemptsFailed — decides when a hold is released early', () => {
  it('keeps the hold when nobody has tried to pay yet', () => {
    expect(allAttemptsFailed([])).toBe(false);
  });

  it('releases when the only attempt failed', () => {
    expect(allAttemptsFailed(at('failed'))).toBe(true);
  });

  it('releases when every one of several attempts failed', () => {
    expect(allAttemptsFailed(at('failed', 'failed', 'failed'))).toBe(true);
  });

  it('keeps the hold while a retry is still in flight', () => {
    // The customer failed once and is trying again inside Checkout.
    expect(allAttemptsFailed(at('failed', 'created'))).toBe(false);
    expect(allAttemptsFailed(at('failed', 'pending'))).toBe(false);
  });

  it('never releases a hold whose money has arrived', () => {
    expect(allAttemptsFailed(at('failed', 'authorized'))).toBe(false);
    expect(allAttemptsFailed(at('failed', 'captured'))).toBe(false);
    expect(allAttemptsFailed(at('captured'))).toBe(false);
  });
});

describe('findUsablePayment', () => {
  it('finds nothing to act on before payment', () => {
    expect(findUsablePayment(at())).toBeUndefined();
    expect(findUsablePayment(at('failed', 'created'))).toBeUndefined();
  });

  it('prefers a captured payment over an authorised one', () => {
    const attempts = [
      { status: 'authorized', id: 'a' },
      { status: 'captured', id: 'c' },
    ];
    expect(findUsablePayment(attempts)?.id).toBe('c');
  });

  it('falls back to an authorised payment so it can be captured', () => {
    expect(
      findUsablePayment([
        { status: 'failed', id: 'f' },
        { status: 'authorized', id: 'a' },
      ])?.id,
    ).toBe('a');
  });
});
