const PDFDocument = require("pdfkit");
const { normalizeAndCalculate } = require("../models/cuadre");

const categories = [
  ["devoluciones", "Devoluciones"],
  ["gastos", "Gastos de ruta"],
  ["retenciones", "Retenciones"],
  ["consignaciones", "Consignaciones"],
];

function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculate(req, res) {
  const result = normalizeAndCalculate(req.body);

  if (result.errors) {
    return res.status(400).json({ errors: result.errors });
  }

  return res.json({ totals: result.totals });
}

function downloadPdf(req, res) {
  const result = normalizeAndCalculate(req.body);

  if (result.errors) {
    return res.status(400).json({ errors: result.errors });
  }

  const { data, totals } = result;
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="cuadre-ruta.pdf"',
  );
  doc.pipe(res);

  doc.fontSize(20).text("Cuadre de ruta", { continued: false });
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Fecha: ${data.route.date || "Sin fecha"}`);
  doc.text(`Conductor: ${data.route.driver || "Sin especificar"}`);
  doc.text(`Auxiliar: ${data.route.auxiliary || "Sin especificar"}`);
  doc.text(
    `Zona: ${data.route.zone || "Sin especificar"}    Placa: ${data.route.plate || "Sin especificar"}`,
  );
  doc.moveDown();

  doc.fontSize(13).text("Datos iniciales", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10);
  doc.text(`Planilla: ${money(data.planilla)}`);
  doc.text(`Abonos: ${money(data.abonos)}`);
  doc.text(`Cambios: ${money(data.cambios)}`);

  for (const [key, label] of categories) {
    doc.moveDown(0.8);
    doc.fontSize(13).text(label, { underline: true });
    doc.moveDown(0.35);
    doc.fontSize(10);
    if (data[key].length === 0) {
      doc.text("Sin registros");
    } else {
      data[key].forEach((row, index) => {
        const reference = row.reference ? ` · ${row.reference}` : "";
        const itemValues =
          key === "devoluciones"
            ? ` · Cantidad: ${row.quantity} · Unitario: ${money(row.unitValue)} · Subtotal: ${money(row.value)}`
            : `${row.quantity !== "" ? ` · Cantidad: ${row.quantity}` : ""} · ${money(row.value)}`;
        doc.text(
          `${index + 1}. ${row.description || "Sin concepto"}${reference}${itemValues}`,
        );
      });
    }
    doc.text(`Total ${label.toLowerCase()}: ${money(totals[key])}`, {
      continued: false,
      bold: true,
    });
  }

  doc.moveDown();
  doc.fontSize(15).text(`Saldo: ${money(totals.balance)}`, { bold: true });
  doc.fontSize(11).text(`Estado: ${totals.status}`);
  doc.end();
}

module.exports = { calculate, downloadPdf };
