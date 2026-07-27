import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Todas las rutas de este archivo requieren un JWT válido con role "admin".
router.use(requireAdmin);

router.get("/solicitudes", (req, res) => {
  const { estado } = req.query;
  const data = db.getAll().profesionales.filter((p) => !estado || p.estado === estado);
  res.json(data);
});

router.get("/solicitudes/:id", (req, res) => {
  const p = db.getProfesionalById(req.params.id);
  if (!p) return res.status(404).json({ error: "No encontrado" });
  res.json(p);
});

router.post("/solicitudes/:id/aprobar", (req, res) => {
  const p = db.updateProfesional(req.params.id, { estado: "aprobado" });
  if (!p) return res.status(404).json({ error: "No encontrado" });
  res.json(p);
});

router.post("/solicitudes/:id/rechazar", (req, res) => {
  const { motivo } = req.body || {};
  const p = db.updateProfesional(req.params.id, { estado: "rechazado", motivoRechazo: motivo || "" });
  if (!p) return res.status(404).json({ error: "No encontrado" });
  res.json(p);
});

// Sirve documentos subidos (DNI/matrícula) solo a administradores autenticados.
// PRODUCCIÓN: usar URLs firmadas de un bucket privado en vez de servir
// archivos directamente desde el servidor de la API.
router.get("/documentos/:archivo", (req, res) => {
  const archivo = path.basename(req.params.archivo); // evita path traversal
  res.sendFile(path.join(__dirname, "..", "..", "uploads", archivo));
});

export default router;
