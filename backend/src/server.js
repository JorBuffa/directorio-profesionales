import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import professionalsRoutes from "./routes/professionals.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// TODO producción: agregar rate limiting (p. ej. express-rate-limit) en
// /api/auth/admin-login y /api/auth/login para mitigar fuerza bruta.

app.use("/api/auth", authRoutes);
app.use("/api/profesionales", professionalsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/salud", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`API de ConectaOficios escuchando en http://localhost:${PORT}`);
});
