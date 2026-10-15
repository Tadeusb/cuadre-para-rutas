# Cuadre de rutas

Aplicación web de una sola página para registrar una ruta, sus devoluciones y movimientos, calcular el saldo y descargar un PDF.

## Requisitos

- Node.js 20 o superior
- npm

## Ejecución local

```sh
npm ci
npm start
```

Abre `http://localhost:3000`. Para ejecutar las pruebas:

```sh
npm test
```

## Reglas del cuadre

El saldo se calcula como:

```text
planilla + abonos - cambios - devoluciones - retenciones - gastos - consignaciones
```

Cada devolución calcula su subtotal multiplicando cantidad por valor unitario. Los datos de la ruta se mantienen en el navegador durante la sesión y no se guardan en una base de datos.
