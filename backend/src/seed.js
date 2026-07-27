// Script de un solo uso para tener datos de ejemplo en /buscar sin pasar
// manualmente por el wizard y la moderación cada vez.
//
// Uso:
//   cd backend
//   node src/seed.js
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";

const EJEMPLOS = [
  {
    nombre: "Marisa Gómez",
    email: "marisa.electricista@ejemplo.com",
    categoria: "electricista",
    descripcion: "Electricista matriculada con 12 años de experiencia en instalaciones domiciliarias y tableros.",
    telefono: "351 555-0101",
    ubicacion: { lat: -31.4135, lng: -64.181, direccion: "Nueva Córdoba, Córdoba" }
  },
  {
    nombre: "Julián Torres",
    email: "julian.plomero@ejemplo.com",
    categoria: "plomero",
    descripcion: "Gasista y plomero, especializado en reparación de cañerías y calefones.",
    telefono: "351 555-0102",
    ubicacion: { lat: -31.4025, lng: -64.1938, direccion: "Alta Córdoba, Córdoba" }
  },
  {
    nombre: "Estudio Maderable",
    email: "carpinteria@ejemplo.com",
    categoria: "carpintero",
    descripcion: "Muebles a medida, restauración y reparaciones de carpintería en general.",
    telefono: "351 555-0103",
    ubicacion: { lat: -31.4368, lng: -64.1823, direccion: "Cerro de las Rosas, Córdoba" }
  },
  {
    nombre: "Pinturas del Sur",
    email: "pintor@ejemplo.com",
    categoria: "pintor",
    descripcion: "Pintura de interiores y exteriores, impermeabilización de techos.",
    telefono: "351 555-0104",
    ubicacion: { lat: -31.4297, lng: -64.2012, direccion: "Güemes, Córdoba" }
  }
];

for (const ejemplo of EJEMPLOS) {
  if (db.getProfesionalByEmail(ejemplo.email)) {
    console.log(`Ya existe, se omite: ${ejemplo.email}`);
    continue;
  }
  db.createProfesional({
    id: uuid(),
    nombre: ejemplo.nombre,
    email: ejemplo.email,
    passwordHash: bcrypt.hashSync("Ejemplo1234!", 10),
    telefono: ejemplo.telefono,
    categoria: ejemplo.categoria,
    descripcion: ejemplo.descripcion,
    ubicacion: ejemplo.ubicacion,
    documentos: { dni: null, matricula: null },
    estado: "aprobado",
    emailVerificado: true,
    creadoEn: new Date().toISOString()
  });
  console.log(`Creado: ${ejemplo.nombre}`);
}

console.log("Listo. Ya podés ver estos profesionales en /buscar.");
