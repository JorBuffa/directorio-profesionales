import { useState, useEffect } from "react";

export default function InstalarAppModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo Apple (iPhone/iPad)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsIos(isIosDevice);

    // Capturar el evento de instalación automática de Android/Chrome/Brave
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstalarClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setMostrarGuia(true);
    }
  };

  return (
    <>
      {/* Botón de acceso directo superior elegante y llamativo */}
      <button
        onClick={handleInstalarClick}
        className="flex items-center gap-2 bg-copper text-paper px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm shadow-md hover:bg-copper-dark transition transform hover:scale-105 border border-paper/40 cursor-pointer"
      >
        <span className="text-base">📱</span>
        <span>¡Llevalo a tu pantalla!</span>
      </button>

      {/* Ventana de Guía Visual Ultra Clara para evitar confusiones */}
      {mostrarGuia && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border-4 border-copper">
            <div className="text-center">
              <span className="text-5xl">📲</span>
              <h3 className="font-display font-bold text-ink text-xl mt-3">
                Instalar "Conecta Oficios"
              </h3>
              <p className="text-xs sm:text-sm text-ink/80 mt-2 leading-relaxed">
                Para tener la aplicación directa en tu celular sin buscarla en internet, hacé lo siguiente:
              </p>
            </div>

            <div className="mt-5 bg-amber-50 p-4 rounded-xl border-2 border-amber-200 space-y-3 text-xs sm:text-sm text-ink">
              {esIos ? (
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>Tocá el botón <strong>Compartir</strong> <span className="text-base">📤</span> abajo en Safari.</li>
                  <li>Buscá y seleccioná <strong className="text-copper">"Agregar al inicio"</strong>.</li>
                  <li>Tocá en <strong>Agregar</strong> arriba a la derecha.</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-3 font-medium">
                  <li>Tocá los <strong>tres puntitos</strong> <span className="text-base">⋮</span> arriba a la derecha del navegador.</li>
                  <li>Buscá la opción que dice <strong className="text-copper">"Instalar aplicación"</strong> o <strong className="text-copper">"Agregar a la pantalla principal"</strong> <span className="text-base">💻</span>.<br/><span className="text-[11px] text-red-600 font-semibold">*(No elijas otras opciones del menú)*</span></li>
                  <li>Tocá en <strong>Instalar</strong> para confirmar. ¡Y listo!</li>
                </ol>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setMostrarGuia(false)}
                className="w-full rounded-xl bg-copper py-3 text-sm font-bold text-paper hover:bg-copper-dark cursor-pointer shadow-lg transition"
              >
                ¡Entendido, ya lo hago!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}