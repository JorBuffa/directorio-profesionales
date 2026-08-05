// src/components/BuscadorInteligente.jsx
import { useState } from "react";
import { interpretarBusqueda } from "../utils/buscadorInteligente";

export default function BuscadorInteligente({ onBuscar }) {
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [escuchando, setEscuchando] = useState(false);

  // Función para activar el micrófono por voz
  function iniciarEscuchaDeVoz() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta búsqueda por voz. Por favor, escribe tu consulta.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR"; // Configurado para español de Argentina
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setEscuchando(true);
    };

    recognition.onresult = async (event) => {
      const transcripcion = event.results[0][0].transcript;
      setTextoBusqueda(transcripcion);
      await ejecutarBusqueda(transcripcion);
    };

    recognition.onerror = (event) => {
      console.error("Error de voz:", event.error);
      setEscuchando(false);
    };

    recognition.onend = () => {
      setEscuchando(false);
    };

    recognition.start();
  }

  async function ejecutarBusqueda(termino) {
    // Traducimos el texto cotidiano consultando a Supabase de forma asíncrona
    const intencionTraducida = await interpretarBusqueda(termino);
    onBuscar(intencionTraducida);
  }

  return (
    <div className="w-full max-w-xl mx-auto my-4">
      <div className="relative flex items-center">
        <input
          type="text"
          value={textoBusqueda}
          onChange={(e) => {
            setTextoBusqueda(e.target.value);
          }}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              await ejecutarBusqueda(textoBusqueda);
            }
          }}
          placeholder="¿Qué necesitas arreglar? (Ej. Necesito alisarme el pelo...)"
          className="w-full rounded-sm border border-stone bg-white px-4 py-3 pr-20 text-ink shadow-sm focus:border-copper focus:outline-none text-sm"
        />
        
        {/* Botón para buscar por escrito */}
        <button
          type="button"
          onClick={async () => await ejecutarBusqueda(textoBusqueda)}
          className="absolute right-12 inset-y-0 px-2.5 flex items-center justify-center text-xs font-bold text-ink/60 hover:text-copper cursor-pointer"
          title="Buscar"
        >
          🔍
        </button>

        {/* Botón de Micrófono */}
        <button
          type="button"
          onClick={iniciarEscuchaDeVoz}
          title="Buscar hablando"
          className={`absolute right-0 inset-y-0 px-3.5 flex items-center justify-center transition cursor-pointer ${
            escuchando ? "text-red-600 animate-pulse bg-red-50" : "text-ink/60 hover:text-copper"
          }`}
        >
          <span className="text-lg">🎤</span>
        </button>
      </div>
      {escuchando && (
        <p className="text-[11px] text-red-600 mt-1 text-center font-medium animate-pulse">
          Escuchando... Habla ahora cerca de tu micrófono.
        </p>
      )}
    </div>
  );
}