import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOrderId,
  validatePhone,
  calculateFees,
} from './validate.js';

describe('validateOrderId', () => {
  it('accepts valid ORD- ids', () => {
    assert.equal(validateOrderId('ORD-ABC12345'), 'ORD-ABC12345');
    assert.equal(validateOrderId('ord-abc12345'), 'ORD-ABC12345');
  });

  it('rejects invalid ids', () => {
    assert.equal(validateOrderId('ORD-ABC'), null);
    assert.equal(validateOrderId(''), null);
  });
});

describe('validatePhone', () => {
  it('accepts 10-digit Ghana numbers starting with 0', () => {
    assert.equal(validatePhone('0551234567'), '0551234567');
  });

  it('rejects invalid phones', () => {
    assert.equal(validatePhone('551234567'), null);
    assert.equal(validatePhone('05512345678'), null);
  });
});

describe('calculateFees', () => {
  it('computes 2% service fee and total', () => {
    const fees = calculateFees(10);
    assert.equal(fees.price, 10);
    assert.equal(fees.serviceFee, 0.2);
    assert.equal(fees.total, 10.2);
  });

  it('returns null for invalid price', () => {
    assert.equal(calculateFees(0), null);
    assert.equal(calculateFees(-1), null);
  });
});
