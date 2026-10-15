const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('sirve la vista y los archivos estáticos', async () => {
  const page = await fetch(baseUrl);
  const html = await page.text();

  assert.equal(page.status, 200);
  assert.match(html, /Cuadre de ruta/);
  assert.equal((await fetch(`${baseUrl}/style.css`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/app.js`)).status, 200);
});

test('calcula el resumen desde la API', async () => {
  const response = await fetch(`${baseUrl}/api/cuadres/resumen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planilla: 1200, abonos: 300, cambios: 100, gastos: [{ description: 'Peaje', value: 200 }] }),
  });

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.totals.balance, 1200);
  assert.equal(result.totals.status, 'Pendiente por consignar');
});

test('suma subtotales de devoluciones calculados con cantidad y valor unitario', async () => {
  const response = await fetch(`${baseUrl}/api/cuadres/resumen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      planilla: 100000,
      devoluciones: [
        { description: 'Producto A', quantity: 10, unitValue: 3172 },
        { description: 'Producto B', quantity: 2, unitValue: 500 },
      ],
    }),
  });

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.totals.devoluciones, 32720);
  assert.equal(result.totals.balance, 67280);
});

test('valida importes y devuelve un PDF descargable', async () => {
  const invalid = await fetch(`${baseUrl}/api/cuadres/resumen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planilla: -1 }),
  });
  assert.equal(invalid.status, 400);

  const response = await fetch(`${baseUrl}/api/cuadres/pdf`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planilla: 1200, route: { driver: 'Ana' } }),
  });
  const pdf = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/pdf/);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 500);
});