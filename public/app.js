const steps = [
  { title: "Datos de ruta", kind: "route" },
  {
    title: "Devoluciones",
    kind: "devoluciones",
    description:
      "Registra facturas o productos devueltos durante el recorrido.",
  },
  {
    title: "Gastos",
    kind: "gastos",
    description: "Añade los gastos asociados a la ruta.",
  },
  {
    title: "Retenciones",
    kind: "retenciones",
    description: "Registra las retenciones realizadas por clientes.",
  },
  {
    title: "Consignaciones",
    kind: "consignaciones",
    description: "Añade cada consignación y su comprobante.",
  },
  { title: "Resumen", kind: "review" },
];

const categoryLabels = {
  devoluciones: "Devoluciones",
  gastos: "Gastos de ruta",
  retenciones: "Retenciones",
  consignaciones: "Consignaciones",
};

const now = new Date();
const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const state = {
  route: { date: localDate, auxiliary: "", driver: "", zone: "", plate: "" },
  planilla: "",
  abonos: "",
  cambios: "",
  devoluciones: [],
  gastos: [],
  retenciones: [],
  consignaciones: [],
};

let activeStep = 0;
let furthestStep = 0;
let calculationTimer;
let latestTotals = {
  devoluciones: 0,
  gastos: 0,
  retenciones: 0,
  consignaciones: 0,
  balance: 0,
  status: "Cuadrado",
};
let requestNumber = 0;

const stepNav = document.querySelector("#step-nav");
const stepForm = document.querySelector("#step-form");
const stepContent = document.querySelector("#step-content");
const errorBox = document.querySelector("#form-error");
const backButton = document.querySelector("#back-button");
const nextButton = document.querySelector("#next-button");
const downloadButton = document.querySelector("#download-button");

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

const formatMoney = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function setError(messages = []) {
  if (!messages.length) {
    errorBox.hidden = true;
    errorBox.innerHTML = "";
    return;
  }
  errorBox.hidden = false;
  errorBox.innerHTML =
    messages.length === 1
      ? escapeHtml(messages[0])
      : `<ul>${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>`;
}

function renderNavigation() {
  stepNav.innerHTML = steps
    .map(
      (step, index) => `
    <button class="step-tab ${index < activeStep ? "is-complete" : ""}" type="button"
      data-step="${index}" aria-current="${index === activeStep ? "step" : "false"}"
      ${index > furthestStep ? "disabled" : ""}>
      <span class="step-index">0${index + 1}</span>${step.title}
    </button>`,
    )
    .join("");
  document.querySelector("#step-count").textContent =
    `PASO 0${activeStep + 1} / 0${steps.length}`;
  document.querySelector("#step-progress").style.width =
    `${((activeStep + 1) / steps.length) * 100}%`;
  backButton.disabled = activeStep === 0;
  nextButton.hidden = activeStep === steps.length - 1;
  downloadButton.disabled = activeStep !== steps.length - 1;
}

function moneyField(id, label, value, required = false) {
  return `<div class="field">
    <label for="${id}">${label}${required ? ' <span aria-hidden="true">*</span>' : ""}</label>
    <div class="money-input-wrap"><span>$</span><input id="${id}" data-base="${id}" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(value)}" placeholder="0" ${required ? "required" : ""}></div>
    <span class="helper-text">Pesos colombianos, sin decimales</span>
  </div>`;
}

function renderRouteStep() {
  return `<div class="step-body">
    <div class="step-title-row"><div><h2>Datos de ruta</h2><p>Identifica el recorrido y registra los valores de la planilla.</p></div></div>
    <div class="fields-grid">
      <div class="field"><label for="date">Fecha <span aria-hidden="true">*</span></label><input id="date" data-route="date" type="date" value="${escapeHtml(state.route.date)}" required></div>
      <div class="field"><label for="auxiliary">Auxiliar</label><input id="auxiliary" data-route="auxiliary" value="${escapeHtml(state.route.auxiliary)}" placeholder="Nombre del auxiliar" maxlength="120"></div>
      <div class="field"><label for="driver">Conductor</label><input id="driver" data-route="driver" value="${escapeHtml(state.route.driver)}" placeholder="Nombre del conductor" maxlength="120"></div>
      <div class="field"><label for="zone">Zona</label><input id="zone" data-route="zone" value="${escapeHtml(state.route.zone)}" placeholder="Zona o recorrido" maxlength="120"></div>
      <div class="field"><label for="plate">Placa</label><input id="plate" data-route="plate" value="${escapeHtml(state.route.plate)}" placeholder="ABC-123" maxlength="120"></div>
    </div>
    <div class="section-kicker">Valores iniciales</div>
    <div class="fields-grid">
      ${moneyField("planilla", "Valor de planilla", state.planilla, true)}
      ${moneyField("abonos", "Abonos", state.abonos)}
      ${moneyField("cambios", "Cambios", state.cambios)}
    </div>
  </div>`;
}

function rowField(
  category,
  index,
  key,
  value,
  placeholder,
  type = "text",
  required = false,
) {
  const inputType = type === "number" ? "number" : "text";
  const attrs =
    inputType === "number"
      ? 'min="0" step="1" inputmode="numeric"'
      : 'maxlength="120"';
  return `<input class="cell-input" data-row-category="${category}" data-row-index="${index}" data-row-key="${key}" type="${inputType}" ${attrs} value="${escapeHtml(value)}" placeholder="${placeholder}" ${required ? "required" : ""}>`;
}

function rowColumns(category) {
  if (category === "devoluciones")
    return ["Factura", "Descripción", "Cant.", "Valor unitario", "Total"];
  if (category === "retenciones") return ["N°", "Cliente", "Valor"];
  if (category === "consignaciones") return ["Comprobante", "Tipo", "Valor"];
  return ["Referencia", "Concepto", "Valor"];
}

function renderCategoryStep(category) {
  const rows = state[category];
  const columns = rowColumns(category);
  const hasQuantity = category === "devoluciones";
  const tableRows = rows.length
    ? rows
        .map(
          (row, index) => `<tr>
      <td>${rowField(category, index, "reference", row.reference, columns[0])}</td>
      <td>${rowField(category, index, "description", row.description, columns[1], "text", true)}</td>
      ${
        hasQuantity
          ? `<td>${rowField(category, index, "quantity", row.quantity, "0", "number", true)}</td>
        <td>${rowField(category, index, "unitValue", row.unitValue, "0", "number", true)}</td>
        <td class="calculated-cell" data-calculated-category="${category}" data-calculated-index="${index}">${formatMoney((Number(row.quantity) || 0) * (Number(row.unitValue) || 0))}</td>`
          : ""
      }
      ${hasQuantity ? "" : `<td>${rowField(category, index, "value", row.value, "0", "number", true)}</td>`}
      <td class="action-cell"><button class="remove-row" type="button" data-remove-category="${category}" data-remove-index="${index}" title="Eliminar fila" aria-label="Eliminar fila">×</button></td>
    </tr>`,
        )
        .join("")
    : `<tr><td class="empty-row" colspan="${hasQuantity ? 6 : 4}">Sin registros</td></tr>`;
  const total = latestTotals[category] || 0;

  return `<div class="step-body">
    <div class="step-title-row"><div><h2>${categoryLabels[category]}</h2><p>${steps[activeStep].description}</p></div></div>
    <div class="table-wrap"><table class="entry-table">
      <thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}<th aria-label="Acciones"></th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table><div class="table-total"><span>Total ${categoryLabels[category].toLowerCase()}</span><strong>${formatMoney(total)}</strong></div></div>
    <button class="add-row-button" type="button" data-add-category="${category}">＋ Agregar fila</button>
  </div>`;
}

function renderReviewStep() {
  const totalBase = (Number(state.planilla) || 0) + (Number(state.abonos) || 0);
  return `<div class="step-body">
    <div class="step-title-row"><div><h2>Resumen del cuadre</h2><p>Verifica los datos antes de descargar el documento.</p></div></div>
    <div class="review-route">
      <div><span>Fecha</span><strong>${escapeHtml(state.route.date || "—")}</strong></div>
      <div><span>Conductor</span><strong>${escapeHtml(state.route.driver || "—")}</strong></div>
      <div><span>Auxiliar</span><strong>${escapeHtml(state.route.auxiliary || "—")}</strong></div>
      <div><span>Zona</span><strong>${escapeHtml(state.route.zone || "—")}</strong></div>
      <div><span>Placa</span><strong>${escapeHtml(state.route.plate || "—")}</strong></div>
      <div><span>Estado</span><strong>${escapeHtml(latestTotals.status)}</strong></div>
    </div>
    <div class="section-kicker">Liquidación</div>
    <div class="review-list">
      <div class="review-line"><span>Planilla</span><strong>${formatMoney(state.planilla)}</strong></div>
      <div class="review-line"><span>Abonos</span><strong>+ ${formatMoney(state.abonos)}</strong></div>
      <div class="review-line"><span>Cambios</span><strong>− ${formatMoney(state.cambios)}</strong></div>
      <div class="review-line total"><span>Base inicial</span><strong>${formatMoney(totalBase)}</strong></div>
      ${Object.keys(categoryLabels)
        .map(
          (category) =>
            `<div class="review-line"><span>${categoryLabels[category]}</span><strong>− ${formatMoney(latestTotals[category])}</strong></div>`,
        )
        .join("")}
      <div class="review-line final"><span>Saldo final</span><strong>${formatMoney(latestTotals.balance)}</strong></div>
    </div>
  </div>`;
}

function renderStep() {
  renderNavigation();
  setError();
  const step = steps[activeStep];
  stepContent.innerHTML =
    step.kind === "route"
      ? renderRouteStep()
      : step.kind === "review"
        ? renderReviewStep()
        : renderCategoryStep(step.kind);
  scheduleCalculation();
}

function payload() {
  return {
    route: state.route,
    planilla: state.planilla,
    abonos: state.abonos,
    cambios: state.cambios,
    devoluciones: state.devoluciones,
    gastos: state.gastos,
    retenciones: state.retenciones,
    consignaciones: state.consignaciones,
  };
}

function paintSummary(totals) {
  latestTotals = totals;
  document.querySelector("#balance-value").textContent = formatMoney(
    totals.balance,
  );
  document.querySelector("#balance-status").textContent = totals.status;
  document
    .querySelector("#balance-block")
    .classList.toggle("is-negative", totals.balance < 0);
  document.querySelector("#sum-planilla").textContent = formatMoney(
    state.planilla,
  );
  document.querySelector("#sum-abonos").textContent =
    `+ ${formatMoney(state.abonos)}`;
  document.querySelector("#sum-cambios").textContent =
    `− ${formatMoney(state.cambios)}`;
  for (const category of Object.keys(categoryLabels)) {
    document.querySelector(`#sum-${category}`).textContent =
      `− ${formatMoney(totals[category])}`;
  }
  document.querySelector("#preview-driver").textContent =
    state.route.driver || "Sin conductor";
  document.querySelector("#preview-route").textContent =
    [state.route.zone, state.route.plate].filter(Boolean).join(" · ") ||
    "Zona y placa pendientes";
  if (
    steps[activeStep].kind !== "route" &&
    steps[activeStep].kind !== "review"
  ) {
    const total = document.querySelector(".table-total strong");
    if (total) total.textContent = formatMoney(totals[steps[activeStep].kind]);
  }
  document
    .querySelectorAll('[data-calculated-category="devoluciones"]')
    .forEach((cell) => {
      const row = state.devoluciones[Number(cell.dataset.calculatedIndex)];
      cell.textContent = formatMoney(
        (Number(row?.quantity) || 0) * (Number(row?.unitValue) || 0),
      );
    });
  if (steps[activeStep].kind === "review")
    stepContent.innerHTML = renderReviewStep();
}

async function calculate() {
  const currentRequest = ++requestNumber;
  try {
    const response = await fetch("/api/cuadres/resumen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const result = await response.json();
    if (currentRequest !== requestNumber) return;
    if (!response.ok) {
      setError(result.errors || ["No se pudo calcular el resumen."]);
      return;
    }
    setError();
    paintSummary(result.totals);
  } catch {
    if (currentRequest === requestNumber)
      setError(["No se pudo conectar con el servidor."]);
  }
}

function scheduleCalculation() {
  clearTimeout(calculationTimer);
  calculationTimer = setTimeout(calculate, 180);
}

function validateStep() {
  if (!stepForm.reportValidity()) return false;
  const step = steps[activeStep];
  if (step.kind !== "route" && categoryLabels[step.kind]) {
    const incomplete = state[step.kind].some(
      (row) =>
        !row.description.trim() ||
        (step.kind === "devoluciones"
          ? row.quantity === "" ||
            Number(row.quantity) < 1 ||
            row.unitValue === ""
          : row.value === ""),
    );
    if (incomplete) {
      setError([
        "Completa el concepto y los valores de cada fila o elimínala antes de continuar.",
      ]);
      return false;
    }
  }
  return true;
}

stepNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step]");
  if (!button || button.disabled) return;
  activeStep = Number(button.dataset.step);
  renderStep();
});

stepForm.addEventListener("input", (event) => {
  const input = event.target;
  if (input.dataset.route) state.route[input.dataset.route] = input.value;
  if (input.dataset.base) state[input.dataset.base] = input.value;
  if (input.dataset.rowCategory) {
    const row =
      state[input.dataset.rowCategory][Number(input.dataset.rowIndex)];
    row[input.dataset.rowKey] = input.value;
  }
  scheduleCalculation();
});

stepForm.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-category]");
  const removeButton = event.target.closest("[data-remove-category]");
  if (addButton) {
    const category = addButton.dataset.addCategory;
    const row =
      category === "devoluciones"
        ? {
            reference: "",
            description: "",
            quantity: "",
            unitValue: "",
            value: "",
          }
        : { reference: "", description: "", quantity: "", value: "" };
    state[category].push(row);
    renderStep();
  }
  if (removeButton) {
    state[removeButton.dataset.removeCategory].splice(
      Number(removeButton.dataset.removeIndex),
      1,
    );
    renderStep();
  }
});

stepForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateStep()) return;
  if (activeStep < steps.length - 1) {
    activeStep += 1;
    furthestStep = Math.max(furthestStep, activeStep);
    renderStep();
  }
});

backButton.addEventListener("click", () => {
  if (activeStep > 0) {
    activeStep -= 1;
    renderStep();
  }
});

document.querySelector("#reset-button").addEventListener("click", () => {
  if (
    !window.confirm(
      "¿Empezar un nuevo cuadre? Se perderán los datos de esta página.",
    )
  )
    return;
  window.location.reload();
});

downloadButton.addEventListener("click", async () => {
  setError();
  downloadButton.disabled = true;
  try {
    const response = await fetch("/api/cuadres/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.errors || ["No se pudo generar el PDF."]);
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "cuadre-ruta.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    setError(["No se pudo conectar con el servidor."]);
  } finally {
    downloadButton.disabled = false;
  }
});

document.querySelector("#today-stamp").textContent = new Intl.DateTimeFormat(
  "es-CO",
  {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
).format(new Date());

renderStep();
