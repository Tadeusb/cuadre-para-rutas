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

## Despliegue en Render

El archivo `render.yaml` configura un servicio web Node en Render. Para desplegar:

1. Sube el repositorio a GitHub.
2. En Render, selecciona **New +** y luego **Blueprint**.
3. Conecta el repositorio de GitHub y confirma la configuración de `render.yaml`.
4. Render instalará dependencias, ejecutará `npm test` y arrancará el servidor con `npm start`.

La aplicación no requiere variables secretas ni base de datos para esta versión.

## Publicar en GitHub

Este directorio todavía no tiene commits ni un remoto configurado. Después de crear un repositorio vacío en GitHub, agrega su URL como remoto y publica la rama `main`:

```sh
git add .
git commit -m "Prepare route reconciliation app for deployment"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

Reemplaza `USUARIO/REPOSITORIO` por el repositorio creado. `node_modules/` y los archivos `.env` están excluidos por `.gitignore`.