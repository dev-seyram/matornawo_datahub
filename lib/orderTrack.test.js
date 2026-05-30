import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicTrackQuery } from './orderTrack.js';

describe('parsePublicTrackQuery', () => {
  it('returns none when no params', () => {
    assert.deepEqual(parsePublicTrackQuery({}), { kind: 'none' });
    assert.deepEqual(parsePublicTrackQuery({ order_id: '', phone: '' }), { kind: 'none' });
  });

  it('returns invalid when both params', () => {
    const result = parsePublicTrackQuery({
      order_id: 'ORD-ABC12345',
      phone: '0551234567',
    });
    assert.equal(result.kind, 'invalid');
    assert.match(result.error, /not both/i);
  });

  it('returns orderId when only order_id', () => {
    const result = parsePublicTrackQuery({ order_id: 'ORD-ABC12345' });
    assert.equal(result.kind, 'orderId');
    assert.equal(result.orderIdInput, 'ORD-ABC12345');
  });

  it('returns phone when only phone', () => {
    const result = parsePublicTrackQuery({ phone: '0551234567' });
    assert.equal(result.kind, 'phone');
    assert.equal(result.phoneInput, '0551234567');
  });

  it('handles array query values', () => {
    const result = parsePublicTrackQuery({ order_id: ['ORD-ABC12345', 'x'] });
    assert.equal(result.kind, 'orderId');
    assert.equal(result.orderIdInput, 'ORD-ABC12345');
  });
});
