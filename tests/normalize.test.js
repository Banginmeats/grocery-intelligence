import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePrice,inferPromo,normalizeRaw,dedupe} from '../scripts/lib/normalize.js';
test('parses ordinary and multi-buy prices',()=>{assert.equal(parsePrice('$2.49'),2.49);assert.equal(parsePrice('3/$12'),4);assert.equal(parsePrice('99¢'),.99)});
test('detects promotions',()=>{assert.equal(inferPromo('Buy one get one free'),'BOGO');assert.equal(inferPromo('digital coupon'),'Digital coupon')});
test('normalizes valid offer',()=>{const x=normalizeRaw({item:'Barilla Pasta',priceText:'3/$4'},'Giant','2026-07-15');assert.equal(x.price,4/3);assert.equal(x.store,'Giant')});
test('deduplicates',()=>{const x={store:'Giant',item:'Milk',size:'1 gal',price:3};assert.equal(dedupe([x,x]).length,1)});
