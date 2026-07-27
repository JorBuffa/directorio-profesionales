import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// NOTA DE PRODUCCIÓN:
// Esta es una base de datos "de juguete" basada en un archivo JSON, pensada
// solo para desarrollo y demos rápidas. Para producción reemplazar por
// PostgreSQL / MySQL / MongoDB con un ORM (Prisma, Sequelize, Mongoose, etc.)
// y mover las contraseñas/documentos sensibles a un almacenamiento cifrado.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { profesionales: [], categorias: DEFAULT_CATEGORIAS };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const DEFAULT_CATEGORIAS = [
  { id: "electricista", nombre: "Electricista" },
  { id: "plomero", nombre: "Plomero / Gasista" },
  { id: "carpintero", nombre: "Carpintero" },
  { id: "pintor", nombre: "Pintor" },
  { id: "albanil", nombre: "Albañil" },
  { id: "jardineria", nombre: "Jardinería" },
  { id: "limpieza", nombre: "Limpieza" },
  { id: "tecnico", nombre: "Técnico en electrodomésticos" }
];

export const db = {
  getAll() {
    return readDB();
  },
  getProfesionales(filtro = {}) {
    const { profesionales } = readDB();
    return profesionales.filter((p) => {
      if (filtro.categoria && p.categoria !== filtro.categoria) return false;
      if (filtro.estado && p.estado !== filtro.estado) return false;
      return true;
    });
  },
  getProfesionalById(id) {
    const { profesionales } = readDB();
    return profesionales.find((p) => p.id === id) || null;
  },
  getProfesionalByEmail(email) {
    const { profesionales } = readDB();
    return profesionales.find((p) => p.email.toLowerCase() === email.toLowerCase()) || null;
  },
  createProfesional(profesional) {
    const data = readDB();
    data.profesionales.push(profesional);
    writeDB(data);
    return profesional;
  },
  updateProfesional(id, cambios) {
    const data = readDB();
    const idx = data.profesionales.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    data.profesionales[idx] = { ...data.profesionales[idx], ...cambios };
    writeDB(data);
    return data.profesionales[idx];
  }
};
