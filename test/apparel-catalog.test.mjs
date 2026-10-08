import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApparelCatalog } from '../utils/apparel-catalog.ts';

const product = {
  id: 'shirt-1',
  title: 'Camera Shirt',
  price: 170000,
  currency: 'KRW',
  images: ['https://images.example.com/shirt.jpg'],
  description: 'Cotton shirt',
  category: '셔츠'
};

test('purchase destination cannot be replaced by upstream input', () => {
  const [result] = parseApparelCatalog({
    products: [{ ...product, purchaseUrl: 'https://evil.example/checkout' }]
  });
  assert.equal(result.purchaseUrl, 'https://enicoveck.com/?product=shirt-1');
  assert.equal(result.price, 170000);
});

test('invalid prices, sold-out rows, duplicate ids and unsafe images never become purchasable cards', () => {
  const result = parseApparelCatalog({
    products: [
      {
        ...product,
        images: [
          'javascript:alert(1)',
          'http://images.example/a.jpg',
          product.images[0],
          product.images[0]
        ]
      },
      product,
      { ...product, id: 'sold', isSoldOut: true },
      { ...product, id: 'negative', price: -1 },
      { ...product, id: 'wrong-currency', currency: 'USD' }
    ]
  });
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].images, product.images);
});

test('empty catalog stays empty and malformed responses fail instead of inventing inventory', () => {
  assert.deepEqual(parseApparelCatalog({ products: [] }), []);
  assert.deepEqual(
    parseApparelCatalog({ products: [{ ...product, isSoldOut: true }] }),
    []
  );
  assert.throws(() => parseApparelCatalog({ error: 'unavailable' }));
  assert.throws(() =>
    parseApparelCatalog({ products: [{ ...product, price: null }] })
  );
});
