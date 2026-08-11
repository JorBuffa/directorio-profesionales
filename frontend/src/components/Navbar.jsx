import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import InstalarAppModal from "./InstalarAppModal.jsx";
import isotipo from "../assets/isotipo.jpg";
import { useRef, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pressTimer = useRef(null);

  // Estado para controlar la ventanita interna del código secreto
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [errorCodigo, setErrorCodigo] = useState(false);

  // Código secreto real configurado
  const CODIGO_SECRETO = "1478";

  // Detección de presión larga (5 segundos) sobre el logo
  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => {
      setCodigoIngresado("");
      setErrorCodigo(false);
      setMostrarModalAdmin(true); // Abre nuestra propia ventanita elegante
    }, 5000); // 5 segundos
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  // Validar el código ingresado
  const handleVerificarAdmin = (e) => {
    e.preventDefault();
    if (codigoIngresado === CODIGO_SECRETO) {
      setMostrarModalAdmin(false);
      navigate("/admin-login");
    } else {
      setErrorCodigo(true);
      setCodigoIngresado("");
    }
  };

  return (
    <>
      <header className="bg-blueprint sticky top-0 z-40 border-b border-blueprint-line shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 flex-wrap gap-3">
          
          {/* LOGO SECRETO: Mantener presionado 5 segundos */}
          <div 
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            title="Mantén presionado 5 segundos..."
            className="cursor-pointer select-none"
          >
            <NavLink to="/" className="flex items-center gap-3 font-display text-lg font-bold text-paper group pointer-events-none sm:pointer-events-auto">
              <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center p-1 shadow-inner border border-copper/40 overflow-hidden pointer-events-auto">
                <img 
                  src={isotipo} 
                  alt="ConectaOficios Isotipo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="group-hover:text-copper transition">
                ConectaOficios
              </span>
            </NavLink>
          </div>

          {/* CONTENEDOR DERECHO: Botón de instalación centrado y sesión */}
          <div className="flex items-center justify-center flex-1 sm:justify-end gap-3 flex-wrap">
            
            <div className="flex justify-center my-1 sm:my-0">
              <InstalarAppModal />
            </div>

            {user && (
              <nav className="flex items-center">
                <button
                  onClick={logout}
                  className="rounded-sm border border-blueprint-line px-3 py-1.5 text-xs text-paper/80 hover:border-copper hover:text-copper transition"
                >
                  Salir ({user.email})
                </button>
              </nav>
            )}
          </div>

        </div>
      </header>

      {/* MODAL INTERNO SECRETO PARA EL CÓDIGO DE 4 DÍGITOS */}
      {mostrarModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-2 border-copper text-center">
            <h3 className="font-display text-xl font-bold text-ink mb-2">
              🔒 Panel de Administración
            </h3>
            <p className="text-sm text-ink/70 mb-4">
              Ingresa tu código secreto de 4 dígitos para continuar:
            </p>

            <form onSubmit={handleVerificarAdmin} className="space-y-4">
              <input
                type="password"
                maxLength="4"
                value={codigoIngresado}
                onChange={(e) => setCodigoIngresado(e.target.value)}
                placeholder="••••"
                autoFocus
                className="w-full text-center text-3xl tracking-widest py-3 border-2 border-stone rounded-lg focus:outline-none focus:border-copper font-mono text-ink"
              />

              {errorCodigo && (
                <p className="text-red-600 text-xs font-bold">
                  ❌ Código incorrecto. Inténtalo de nuevo.
                </p>
              )}

              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAdmin(false)}
                  className="px-4 py-2 rounded-lg border border-stone text-ink/70 hover:bg-stone/10 text-sm font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-copper text-paper font-bold hover:bg-copper-dark text-sm shadow-md transition"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}