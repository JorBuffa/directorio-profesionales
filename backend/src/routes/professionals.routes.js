import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { db, DEFAULT_CATEGORIAS } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Almacenamiento de documentos (DNI, matrícula/certificación).
// PRODUCCIÓN: subir a un bucket privado (S3/GCS) con URLs firmadas de corta
// duración, escaneo antivirus, y límites de tipo/tamaño más estrictos.
const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const permitidos = [".pdf", ".jpg", ".jpeg", ".png"];
    cb(null, permitidos.includes(path.extname(file.originalname).toLowerCase()));
  }
});

router.get("/categorias", (req, res) => {
  res.json(DEFAULT_CATEGORIAS);
});

// Listado para el mapa de /buscar, con filtro opcional por categoría.
// Solo se exponen profesionales con estado "aprobado".
router.get("/", (req, res) => {
  const { categoria } = req.query;
  const profesionales = db
    .getProfesionales({ categoria: categoria || undefined, estado: "aprobado" })
    .map(publico);
  res.json(profesionales);
});

router.get("/:id", (req, res) => {
  const p = db.getProfesionalById(req.params.id);
  if (!p || p.estado !== "aprobado") return res.status(404).json({ error: "No encontrado" });
  res.json(publico(p));
});

// Paso final del wizard: crea la solicitud con estado "pendiente".
router.post(
  "/registro",
  upload.fields([
    { name: "dni", maxCount: 1 },
    { name: "matricula", maxCount: 1 }
  ]),
  (req, res) => {
    const { nombre, email, password, telefono, categoria, descripcion, lat, lng, direccion } = req.body;

    if (!nombre || !email || !password || !categoria || !lat || !lng) {
      return res.status(400).json({ error: "Faltan datos obligatorios del formulario" });
    }
    if (db.getProfesionalByEmail(email)) {
      return res.status(409).json({ error: "Ya existe una solicitud con ese email" });
    }

    const archivos = req.files || {};
    const profesional = {
      id: uuid(),
      nombre,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      telefono: telefono || "",
      categoria,
      descripcion: descripcion || "",
      ubicacion: { lat: Number(lat), lng: Number(lng), direccion: direccion || "" },
      documentos: {
        dni: archivos.dni?.[0]?.filename || null,
        matricula: archivos.matricula?.[0]?.filename || null
      },
      estado: "pendiente", // pendiente | aprobado | rechazado
      // Los PROFESIONALES sí pasan por verificación de email real, ya que
      // se registran ellos mismos (a diferencia del admin, que es una
      // cuenta de sistema preexistente).
      emailVerificado: process.env.REQUIRE_EMAIL_VERIFICATION !== "true",
      creadoEn: new Date().toISOString()
    };

    db.createProfesional(profesional);
    res.status(201).json({
      mensaje: "Solicitud recibida. Te avisaremos cuando sea revisada.",
      id: profesional.id
    });
  }
);

// Consulta de estado para /mi-perfil (requiere estar logueado como profesional)
router.get("/me/estado", requireAuth, (req, res) => {
  if (req.user.role !== "profesional") return res.status(403).json({ error: "No autorizado" });
  const p = db.getProfesionalById(req.user.id);
  if (!p) return res.status(404).json({ error: "No encontrado" });
  res.json(publico(p, true));
});

function publico(p, incluirEstado = false) {
  const base = {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    telefono: p.telefono,
    ubicacion: p.ubicacion
  };
  if (incluirEstado) base.estado = p.estado;
  return base;
}

export default router;
