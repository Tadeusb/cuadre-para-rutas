const categories = ["devoluciones", "gastos", "retenciones", "consignaciones"];

function amount(value, label, errors) {
  const parsed =
    value === "" || value === null || value === undefined ? 0 : Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    errors.push(`${label} debe ser un número entero igual o mayor que cero.`);
    return 0;
  }

  return parsed;
}

function text(value, label, errors) {
  const parsed = String(value ?? "").trim();

  if (parsed.length > 120) {
    errors.push(`${label} no puede superar 120 caracteres.`);
    return "";
  }

  return parsed;
}

function normalizeAndCalculate(input = {}) {
  const errors = [];
  const route = input.route || {};
  if (
    input.planilla === null ||
    input.planilla === undefined ||
    String(input.planilla).trim() === ""
  ) {
    errors.push("El valor de planilla es obligatorio.");
  }
  const normalized = {
    route: {
      date: text(route.date, "La fecha", errors),
      auxiliary: text(route.auxiliary, "El auxiliar", errors),
      driver: text(route.driver, "El conductor", errors),
      zone: text(route.zone, "La zona", errors),
      plate: text(route.plate, "La placa", errors),
    },
    planilla: amount(input.planilla, "La planilla", errors),
    abonos: amount(input.abonos, "Los abonos", errors),
    cambios: amount(input.cambios, "Los cambios", errors),
    devoluciones: [],
    gastos: [],
    retenciones: [],
    consignaciones: [],
  };

  for (const category of categories) {
    const rows = input[category] ?? [];

    if (!Array.isArray(rows) || rows.length > 200) {
      errors.push(`La lista de ${category} no es válida.`);
      continue;
    }

    normalized[category] = rows.map((row, index) => {
      const item = {
        description: text(
          row?.description,
          `${category}, fila ${index + 1}`,
          errors,
        ),
        reference: text(
          row?.reference,
          `${category}, referencia ${index + 1}`,
          errors,
        ),
      };

      if (category === "devoluciones") {
        item.quantity = amount(
          row?.quantity,
          `devoluciones, cantidad ${index + 1}`,
          errors,
        );
        item.unitValue = amount(
          row?.unitValue,
          `devoluciones, valor unitario ${index + 1}`,
          errors,
        );
        if (item.quantity < 1)
          errors.push(
            `devoluciones, cantidad ${index + 1} debe ser mayor que cero.`,
          );
        item.value = item.quantity * item.unitValue;
        if (!Number.isSafeInteger(item.value))
          errors.push(
            `devoluciones, total ${index + 1} supera el valor permitido.`,
          );
      } else {
        item.quantity =
          row?.quantity === "" ||
          row?.quantity === null ||
          row?.quantity === undefined
            ? ""
            : amount(
                row.quantity,
                `${category}, cantidad ${index + 1}`,
                errors,
              );
        item.value = amount(
          row?.value,
          `${category}, valor ${index + 1}`,
          errors,
        );
      }

      return item;
    });
  }

  if (errors.length) {
    return { errors };
  }

  const totals = Object.fromEntries(
    categories.map((category) => [
      category,
      normalized[category].reduce((sum, row) => sum + row.value, 0),
    ]),
  );

  totals.balance =
    normalized.planilla +
    normalized.abonos -
    normalized.cambios -
    totals.devoluciones -
    totals.retenciones -
    totals.gastos -
    totals.consignaciones;

  totals.status =
    totals.balance > 0
      ? "Pendiente por consignar"
      : totals.balance < 0
        ? "Excedente consignado"
        : "Cuadrado";

  return { data: normalized, totals };
}

module.exports = { normalizeAndCalculate };
