# ConectaOficios

Marketplace de oficios y servicios profesionales: mapa con geolocalización,
búsqueda por distancia y categoría, wizard de alta de profesionales en 4
pasos, y panel de administración para moderar solicitudes.

## Estructura

```
conectaoficios/
├── backend/     # API Express (auth, profesionales, admin)
└── frontend/    # React + Vite + Tailwind + Leaflet
```

## Cómo correrlo

**Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:4000
```

Opcional: para no ver `/buscar` vacío, cargá 4 profesionales de ejemplo ya
aprobados (Córdoba capital):
```bash
npm run seed
```

**Frontend** (en otra terminal)
```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

El frontend proxéa `/api` hacia `http://localhost:4000` (ver `vite.config.js`).

## Rutas del frontend

| Ruta              | Descripción                                             |
|-------------------|----------------------------------------------------------|
| `/`               | Landing de bienvenida                                    |
| `/buscar`         | Mapa + lista de profesionales aprobados, por distancia   |
| `/soy-profesional`| Wizard de alta en 4 pasos (datos, oficio, ubicación, docs)|
| `/mi-perfil`      | Estado de la solicitud (pendiente/aprobado/rechazado)     |
| `/admin-login`    | Login del panel de administración                         |
| `/admin`          | Moderación: aprobar/rechazar, ver documentos              |

## Credenciales de administrador (solo desarrollo)

```
Email:    admin@conectaoficios.com
Password: Admin1234!
```

Se configuran en `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) y **no**
están hardcodeadas en el código fuente. En `/admin-login` aparece además un
botón de "acceso rápido demo" que solo se muestra si `NODE_ENV !== production`
y `ENABLE_DEMO_LOGIN_BUTTON=true` — el propio backend deja de exponerlo al
desplegar a producción.

Importante: ese botón **no evita el login**, solo autocompleta y envía las
credenciales demo por el mismo endpoint que cualquier otro intento de acceso
(`POST /api/auth/admin-login`), que sigue validando usuario/contraseña con
bcrypt y devolviendo un JWT de 8 horas.

### Por qué el admin no pasa por confirmación de email

El admin es una **cuenta de sistema** preexistente (no se autorregistra), por
lo que no tiene sentido aplicarle el flujo de "confirmá tu email", que existe
para verificar que el correo de un **profesional nuevo** es real. Los
profesionales sí pasan por ese flujo si `REQUIRE_EMAIL_VERIFICATION=true`.

## ⚠️ Antes de llevar esto a producción

Este proyecto está pensado como base de desarrollo/demo. Como mínimo, antes
de un despliegue real hay que:

1. **Eliminar el botón de acceso demo** y las credenciales de ejemplo del
   `.env`; usar un secret manager, no un archivo `.env` versionado.
2. **Reemplazar la "base de datos" JSON** (`backend/src/data/db.json`) por
   una base real (PostgreSQL, MySQL, MongoDB) con transacciones e índices.
3. **Agregar rate limiting** (p. ej. `express-rate-limit`) en los endpoints
   de login para mitigar fuerza bruta, y considerar 2FA para el admin.
4. **Mover los documentos subidos** (DNI, matrícula) a un bucket privado
   (S3/GCS) con URLs firmadas de corta duración y escaneo antivirus, en vez
   de servirlos desde el propio servidor de la API.
5. **Habilitar HTTPS**, cookies `httpOnly`/`secure` para el token (en vez de
   `localStorage`, que es más vulnerable a robo vía XSS) y cabeceras de
   seguridad (helmet, CSP).
6. **Confirmar el email de los profesionales antes de exponer su solicitud**
   a moderación, para reducir spam y suplantaciones.
7. Sumar logs de auditoría de accesos al panel `/admin` y a las decisiones
   de aprobación/rechazo.

## Notas técnicas

- El mapa usa **Leaflet + OpenStreetMap** (gratuito, sin API key).
- El geocoding de direcciones usa **Nominatim** (OpenStreetMap); para
  volumen alto en producción conviene un proveedor con SLA (Mapbox, Google).
- Las contraseñas se guardan con **bcrypt** (`bcryptjs`), nunca en texto
  plano.
- Los tokens de sesión son **JWT de 8 horas** firmados con `JWT_SECRET`.
