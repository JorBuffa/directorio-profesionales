import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

export default function ActualizarContrasena() {
  const navigate = useNavigate();
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [sesionValida, setSesionValida] = useState(false);

  useEffect(() => {
    async function verificarSesion() {
      // Verificamos si la URL actual realmente trae los parámetros de recuperación de Supabase
      const hash = window.location.hash;
      const search = window.location.search;
      const esEnlaceDeRecuperacion = hash.includes("type=recovery") || search.includes("type=recovery") || hash.includes("access_token");

      const { data: { session } } = await supabase.auth.getSession();

      // Solo permitimos ver el formulario si hay sesión Y la URL actual vino directa del correo de recuperación.
      // Si la pestaña 1 (original) se abrió sin esos parámetros en su URL, la sacamos de inmediato al login.
      if (session && esEnlaceDeRecuperacion) {
        setSesionValida(true);
      } else {
        navigate("/soy-profesional", { replace: true });
      }
    }
    verificarSesion();
  }, [navigate]);

  async function handleActualizar(e) {
    e.preventDefault();

    if (nuevaPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaPassword,
      });

      if (error) throw error;

      alert("¡Contraseña restablecida con éxito!");
      
      // Cerramos sesión para limpiar el token residual del navegador
      await supabase.auth.signOut();

      // Cerramos la pestaña de recuperación automáticamente
      try {
        window.close();
      } catch {
        navigate("/soy-profesional", { replace: true });
      }

    } catch (err) {
      setMensaje("Error al actualizar la contraseña: " + err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-sm border border-stone bg-white p-8 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-ink">Restablecer contraseña</h1>
        <p className="mt-1 text-sm text-ink/60">Ingresa tu nueva contraseña para continuar.</p>

        {mensaje && (
          <p className="mt-4 rounded-sm bg-copper/10 p-3 text-xs font-medium text-copper-dark">
            {mensaje}
          </p>
        )}

        {sesionValida && (
          <form onSubmit={handleActualizar} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">
                Nueva contraseña
              </label>
              <div className="relative mt-1">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-sm border border-stone px-3 py-2 pr-10 text-ink focus:border-copper focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/50 hover:text-ink cursor-pointer text-xs font-medium"
                >
                  {mostrarPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-sm bg-copper py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}