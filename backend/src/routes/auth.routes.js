import { Router } from "express";
import bcrypt from "bcryptjs";
import { firmarToken } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

// ---------------------------------------------------------------------------
// LOGIN DE ADMINISTRADOR
// ---------------------------------------------------------------------------
// El admin es una cuenta de sistema (no se "registra" como un profesional),
// por lo que no pasa por el flujo de confirmación por email: ese flujo existe
// para verificar que el email de un PROFESIONAL nuevo es real, no para
// controlar el acceso del panel interno. El panel interno se protege con
// usuario/contraseña + JWT de corta duración, y en producción debería
// sumarse 2FA e IP allow-list si es posible.
//
// IMPORTANTE PARA PRODUCCIÓN:
// - No hardcodear ni versionar credenciales de admin. Usar variables de
//   entorno gestionadas por un secret manager (no un .env en el repo).
// - Guardar solo el hash bcrypt de la contraseña, nunca el texto plano.
// - Agregar rate limiting / bloqueo tras intentos fallidos (ver server.js).
// - Quitar por completo ENABLE_DEMO_LOGIN_BUTTON y este comentario en prod.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@conectaoficios.com").toLowerCase();
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "Admin1234!", 10);

router.post("/admin-login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  const emailOk = email.toLowerCase() === ADMIN_EMAIL;
  const passwordOk = emailOk && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);

  if (!emailOk || !passwordOk) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = firmarToken({ role: "admin", email: ADMIN_EMAIL });
  res.json({ token, user: { email: ADMIN_EMAIL, role: "admin" } });
});

// Indica al frontend si puede mostrar el botón de "acceso rápido demo".
// Nunca devuelve la contraseña real; solo la bandera de configuración.
router.get("/admin-login/demo-disponible", (req, res) => {
  res.json({
    disponible: process.env.ENABLE_DEMO_LOGIN_BUTTON === "true" && process.env.NODE_ENV !== "production",
    email_demo: process.env.ADMIN_EMAIL || "admin@conectaoficios.com"
  });
});

// ---------------------------------------------------------------------------
// LOGIN DE PROFESIONAL (para consultar /mi-perfil)
// ---------------------------------------------------------------------------
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const profesional = db.getProfesionalByEmail(email || "");

  if (!profesional || !bcrypt.compareSync(password || "", profesional.passwordHash)) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const requiereVerificacion = process.env.REQUIRE_EMAIL_VERIFICATION === "true";
  if (requiereVerificacion && !profesional.emailVerificado) {
    return res.status(403).json({
      error: "Debés confirmar tu email antes de ingresar. Revisá tu bandeja de entrada."
    });
  }

  const token = firmarToken({ role: "profesional", id: profesional.id, email: profesional.email });
  res.json({
    token,
    user: {
      id: profesional.id,
      email: profesional.email,
      nombre: profesional.nombre,
      estado: profesional.estado
    }
  });
});

export default router;
