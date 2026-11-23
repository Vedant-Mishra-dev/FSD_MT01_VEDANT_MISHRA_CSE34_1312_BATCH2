'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

let server;
let baseUrl;

test.beforeEach(async () => {
  server = createApp().listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterEach(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

function jsonOptions(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function validProduct(overrides = {}) {
  return {
    name: 'Water Bottle',
    category: 'Accessories',
    price: 299,
    quantity: 40,
    inStock: true,
    ...overrides
  };
}

test('GET /api/products returns all three initial products with HTTP 200', async () => {
  const response = await request('/api/products');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 3);
  assert.equal(body[0].id, 301);
  assert.equal(body[1].name, 'Notebook');
  assert.equal(body[2].inStock, false);
});

test('POST /api/products creates a product and generates ID 304', async () => {
  const response = await request('/api/products', jsonOptions('POST', validProduct()));
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.product.id, 304);
  assert.equal(body.product.name, 'Water Bottle');
  assert.equal(body.product.price, 299);
});

test('POST rejects invalid product data with HTTP 400', async () => {
  const invalidCases = [
    ['missing name', { category: 'Accessories', price: 299, quantity: 40, inStock: true }],
    ['price supplied as a string', validProduct({ price: '299' })],
    ['negative quantity', validProduct({ quantity: -1 })],
    ['inStock supplied as a string', validProduct({ inStock: 'true' })],
    ['extra ID field', { ...validProduct(), id: 999 }]
  ];

  for (const [caseName, product] of invalidCases) {
    const response = await request('/api/products', jsonOptions('POST', product));
    const body = await response.json();
    assert.equal(response.status, 400, `Expected HTTP 400 for ${caseName}`);
    assert.equal(body.message, 'Invalid product data.');
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length > 0);
  }
});

test('GET /api/products/:id returns the matching product with HTTP 200', async () => {
  const response = await request('/api/products/301');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.id, 301);
  assert.equal(body.name, 'Wireless Mouse');
});

test('GET by ID returns HTTP 404 for a missing product and HTTP 400 for an invalid ID', async () => {
  const missingResponse = await request('/api/products/9999');
  const invalidResponse = await request('/api/products/not-a-number');

  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).message, 'Product not found.');
  assert.equal(invalidResponse.status, 400);
});

test('PUT /api/products/:id updates a product and preserves its ID', async () => {
  const updatedData = validProduct({
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 749,
    quantity: 20,
    inStock: true
  });
  const response = await request('/api/products/301', jsonOptions('PUT', updatedData));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.product.id, 301);
  assert.equal(body.product.price, 749);
  assert.equal(body.product.quantity, 20);

  const getResponse = await request('/api/products/301');
  assert.equal((await getResponse.json()).price, 749);
});

test('PUT returns HTTP 404 for a missing product and HTTP 400 for an invalid body', async () => {
  const missingResponse = await request('/api/products/9999', jsonOptions('PUT', validProduct()));
  const invalidResponse = await request('/api/products/301', jsonOptions('PUT', validProduct({ quantity: '20' })));

  assert.equal(missingResponse.status, 404);
  assert.equal(invalidResponse.status, 400);
});

test('DELETE /api/products/:id deletes a product and returns HTTP 200', async () => {
  const response = await request('/api/products/303', { method: 'DELETE' });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.product.id, 303);
  assert.equal(body.message, 'Product deleted successfully.');

  const followUpResponse = await request('/api/products/303');
  assert.equal(followUpResponse.status, 404);
});

test('DELETE returns HTTP 404 for a missing product', async () => {
  const response = await request('/api/products/9999', { method: 'DELETE' });
  assert.equal(response.status, 404);
});

test('GET filter matches categories without case sensitivity', async () => {
  const response = await request('/api/products/filter?category=eLeCtRoNiCs');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 2);
  assert.ok(body.every((product) => product.category === 'Electronics'));
});

test('GET filter returns an empty array when there are no matches', async () => {
  const response = await request('/api/products/filter?category=Furniture');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, []);
});

test('GET filter returns HTTP 400 when category is missing', async () => {
  const response = await request('/api/products/filter');
  assert.equal(response.status, 400);
});

test('Malformed JSON returns HTTP 400 with a JSON error response', async () => {
  const response = await request('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "name": '
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, 'Invalid JSON request body.');
});

test('Unknown routes return HTTP 404', async () => {
  const response = await request('/api/unknown');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, 'Route not found.');
});
