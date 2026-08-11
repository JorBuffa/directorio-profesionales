import { useState, useEffect } from "react";

export default function InstalarAppModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo Apple (iPhone/iPad)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsIos(isIosDevice);

    // Capturar el evento de instalación automática de Android/Chrome
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
      // Si el navegador soporta la instalación directa automática
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // Si no la soporta de forma directa o es iPhone, abrimos la guía visual amigable
      setMostrarGuia(true);
    }
  };

  return (
    <>
      {/* Botón flotante llamativo */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleInstalarClick}
          className="flex items-center gap-2 bg-copper text-paper px-4 py-3 rounded-full shadow-2xl font-bold text-xs sm:text-sm hover:scale-105 transition border-2 border-paper cursor-pointer animate-bounce"
        >
          <span>📱</span>
          <span>¡Llévame a tu pantalla!</span>
        </button>
      </div>

      {/* Ventana de Guía Visual súper amigable */}
      {mostrarGuia && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border-2 border-copper">
            <div className="text-center">
              <span className="text-4xl">📲</span>
              <h3 className="font-display font-bold text-ink text-lg mt-2">
                Instalar Conecta Oficios en tu celular
              </h3>
              <p className="text-xs text-ink/70 mt-1">
                Para tener la aplicación siempre a mano en tu pantalla de inicio sin buscarla en internet, hacé lo siguiente:
              </p>
            </div>

            <div className="mt-4 bg-stone/10 p-4 rounded-lg border border-stone/30 space-y-3 text-xs text-ink">
              {esIos ? (
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>Tocá el botón de <strong>Compartir</strong> <span className="text-lg">📤</span> abajo en tu navegador Safari.</li>
                  <li>Buscá y seleccioná la opción <strong className="text-copper">"Agregar al inicio"</strong>.</li>
                  <li>Tocá en <strong>Agregar</strong> arriba a la derecha. ¡Listo!</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>Tocá los <strong>tres puntitos</strong> <span className="text-lg">⋮</span> arriba a la derecha de tu pantalla.</li>
                  <li>Buscá en el menú la opción <strong className="text-copper">"Instalar aplicación"</strong> o <strong className="text-copper">"Agregar a la pantalla principal"</strong>.</li>
                  <li>Confirmá tocando en <strong>Instalar</strong>. ¡Y ya queda en tu celular como una aplicación más!</li>
                </ol>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setMostrarGuia(false)}
                className="w-full rounded-lg bg-copper py-2.5 text-xs font-bold text-paper hover:opacity-90 cursor-pointer shadow-md"
              >
                ¡Entendido, gracias!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}