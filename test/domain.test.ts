import { test } from 'node:test';
import assert from 'node:assert/strict';
import { netPrice, lineTotal } from '../src/common/money';
import { combinations, signature } from '../src/common/variants';
test('discounts round each unit half-up and multiply with decimal precision', () => {
  assert.equal(netPrice('999999999999999999.99', 15).toFixed(2), '849999999999999999.99');
  assert.equal(netPrice('0.05', 10).toFixed(2), '0.05');
  assert.equal(lineTotal('19.99', 15, 3).toFixed(2), '50.97');
  assert.equal(lineTotal('0.10', 0, 3).toFixed(2), '0.30');
});
test('variants use stable option signatures, bounded Cartesian products, and a default variant', () => {
  assert.deepEqual(combinations([]), [{}]);
  assert.deepEqual(
    combinations([
      { name: 'color', values: ['red', 'blue'] },
      { name: 'size', values: ['S'] },
    ]),
    [
      { color: 'red', size: 'S' },
      { color: 'blue', size: 'S' },
    ],
  );
  assert.equal(signature({ size: 'S', color: 'red' }), signature({ color: 'red', size: 'S' }));
  assert.throws(() =>
    combinations([
      { name: 'color', values: ['r'] },
      { name: 'color', values: ['b'] },
    ]),
  );
  assert.throws(() => combinations([{ name: 'color', values: [] }]));
});
