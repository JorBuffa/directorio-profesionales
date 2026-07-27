import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-cambiar";

export function firmarToken(payload) {
  // Expira en 8 horas: un token de admin de vida corta reduce el riesgo
  // si llegara a filtrarse.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  // Se acepta también ?token= en query string únicamente para la ruta de
  // descarga de documentos, ya que un <a href> no puede enviar cabeceras
  // personalizadas. Este token igual se valida y expira como cualquier JWT.
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token || null;
  if (!token) return res.status(401).json({ error: "No autenticado" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acceso restringido a administradores" });
    }
    next();
  });
}
