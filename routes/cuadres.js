const express = require("express");
const controller = require("../controllers/cuadresController");

const router = express.Router();

router.post("/resumen", controller.calculate);
router.post("/pdf", controller.downloadPdf);

module.exports = router;
