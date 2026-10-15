const express = require("express");
const path = require("node:path");
const cuadresRouter = require("./routes/cuadres");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/cuadres", cuadresRouter);

app.get("/", (req, res) => {
  res.render("index", { title: "Cuadre de Rutas" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const requestId = req.headers["x-vercel-id"] || req.headers["x-request-id"] || "unknown";
  console.error(`[http] ${req.method} ${req.path} request=${requestId}`, error?.stack || error);
  res.status(500).json({ errors: ["Ocurrió un error al procesar la solicitud."] });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
  });
}

module.exports = app;
