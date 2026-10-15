const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAndCalculate } = require('../models/cuadre');

test('calcula el saldo restando cada tipo de salida', () => {
  const result = normalizeAndCalculate({
    planilla: 12000000,
    abonos: 535000,
    cambios: 206344,
    devoluciones: [{ description: 'Factura', quantity: 3, unitValue: 33267 }],
    gastos: [{ description: 'Hospedaje', value: 94000 }],
    retenciones: [{ description: 'Cliente', value: 54708 }],
    consignaciones: [{ description: 'Comprobante', value: 3078600 }],
  });

  assert.deepEqual(result.totals, {
    devoluciones: 99801,
    gastos: 94000,
    retenciones: 54708,
    consignaciones: 3078600,
    balance: 9001547,
    status: 'Pendiente por consignar',
  });
});

test('multiplica cantidad por valor unitario en cada devolución y suma subtotales', () => {
  const result = normalizeAndCalculate({
    planilla: 0,
    devoluciones: [
      { description: 'Producto A', quantity: 10, unitValue: 3172 },
      { description: 'Producto B', quantity: 2, unitValue: 500 },
    ],
  });

  assert.equal(result.data.devoluciones[0].value, 31720);
  assert.equal(result.data.devoluciones[1].value, 1000);
  assert.equal(result.totals.devoluciones, 32720);
});

test('requiere cantidad positiva y valor unitario válido en devoluciones', () => {
  const result = normalizeAndCalculate({
    planilla: 0,
    devoluciones: [{ description: 'Producto', quantity: 0, unitValue: 100 }],
  });

  assert.ok(result.errors.some((error) => error.includes('cantidad 1 debe ser mayor que cero')));
});

test('clasifica saldos en cero y negativos', () => {
  assert.equal(normalizeAndCalculate({ planilla: 100, consignaciones: [{ value: 100 }] }).totals.status, 'Cuadrado');
  const result = normalizeAndCalculate({ planilla: 80, consignaciones: [{ value: 100 }] });
  assert.equal(result.totals.balance, -20);
  assert.equal(result.totals.status, 'Excedente consignado');
});

test('rechaza importes negativos o no enteros', () => {
  const result = normalizeAndCalculate({
    planilla: -1,
    gastos: [{ description: 'Combustible', value: 2.5 }],
  });

  assert.equal(result.errors.length, 2);
});

test('permite categorías vacías y trata campos monetarios vacíos como cero', () => {
  const result = normalizeAndCalculate({ planilla: 0, abonos: '', cambios: '' });

  assert.deepEqual(result.totals, {
    devoluciones: 0,
    gastos: 0,
    retenciones: 0,
    consignaciones: 0,
    balance: 0,
    status: 'Cuadrado',
  });
});

test('requiere planilla y permite que abonos y cambios vacíos valgan cero', () => {
  const missingPlanilla = normalizeAndCalculate({ abonos: '', cambios: '' });
  assert.ok(missingPlanilla.errors.some((error) => error.includes('planilla es obligatorio')));

  const result = normalizeAndCalculate({ planilla: 500, abonos: '', cambios: '' });
  assert.equal(result.totals.balance, 500);
});