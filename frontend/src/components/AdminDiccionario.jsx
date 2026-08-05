import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";

export default function AdminDiccionario() {
  const [rubros, setRubros] = useState([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState("");
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarRubros() {
      const { data } = await supabase.from('rubros').select('*');
      if (data) setRubros(data);
    }
    cargarRubros();
  }, []);

  function escucharPalabraNueva() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.onresult = (event) => {
      const palabraDetectada = event.results[0][0].transcript.toLowerCase().trim();
      setNuevaPalabra(palabraDetectada);
    };
    recognition.start();
  }

  async function guardarSinonimo(e) {
    e.preventDefault();
    if (!nuevaPalabra || !rubroSeleccionado) {
      alert("Por favor ingresa la palabra y selecciona un rubro.");
      return;
    }

    const palabraLimpia = nuevaPalabra.toLowerCase().trim();
    setMensaje("");

    // 1. Verificamos si ya existe una fila para este rubro en el diccionario
    const { data: existente, error: errorBusqueda } = await supabase
      .from('diccionario_sinonimos')
      .select('*')
      .eq('rubro_id', rubroSeleccionado)
      .maybeSingle();

    if (errorBusqueda) {
      alert("Error al buscar en el diccionario: " + errorBusqueda.message);
      return;
    }

    let errorSupabase = null;

    if (existente) {
      // 2. Si ya existe, unimos la palabra nueva a las anteriores separadas por coma
      let palabrasActuales = existente.palabra ? existente.palabra.split(',').map(p => p.trim()) : [];
      
      if (!palabrasActuales.includes(palabraLimpia)) {
        palabrasActuales.push(palabraLimpia);
        const palabrasActualizadas = palabrasActuales.join(', ');

        // Actualizamos la misma fila existente
        const { error } = await supabase
          .from('diccionario_sinonimos')
          .update({ palabra: palabrasActualizadas })
          .eq('id', existente.id);
        
        errorSupabase = error;
      } else {
        setMensaje(`¡La palabra "${palabraLimpia}" ya estaba guardada en este rubro!`);
        setNuevaPalabra("");
        return;
      }
    } else {
      // 3. Si no existe ninguna fila para este rubro, creamos la primera
      const { error } = await supabase
        .from('diccionario_sinonimos')
        .insert([{ palabra: palabraLimpia, rubro_id: rubroSeleccionado }]);
      
      errorSupabase = error;
    }

    if (errorSupabase) {
      alert("Error al guardar: " + errorSupabase.message);
    } else {
      setMensaje(`¡Palabra "${nuevaPalabra}" agregada con éxito!`);
      setNuevaPalabra("");
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-sm border border-stone shadow-sm mt-6">
      <h2 className="font-display text-xl font-bold text-ink mb-2">🎓 Educar Diccionario de la App</h2>
      <p className="text-xs text-ink/60 mb-4">
        Agregá modismos o términos locales para que la búsqueda por voz los reconozca al instante.
      </p>

      <form onSubmit={guardarSinonimo} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-stone-dark mb-1">1. Seleccioná el rubro:</label>
          <select 
            value={rubroSeleccionado} 
            onChange={(e) => setRubroSeleccionado(e.target.value)}
            className="w-full border border-stone p-2 rounded-sm text-xs text-ink bg-white focus:border-copper focus:outline-none"
          >
            <option value="">-- Elegir rubro --</option>
            {rubros.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-stone-dark mb-1">2. Palabra o término nuevo:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaPalabra}
              onChange={(e) => setNuevaPalabra(e.target.value)}
              placeholder="Ej: minidonas, birra, changarín..."
              className="flex-grow border border-stone p-2 rounded-sm text-xs text-ink focus:border-copper focus:outline-none"
            />
            <button
              type="button"
              onClick={escucharPalabraNueva}
              title="Decir la palabra por voz"
              className="bg-copper text-paper px-3 py-2 rounded-sm text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              🎤 Hablar
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-ink text-paper py-2.5 rounded-sm text-xs font-bold hover:bg-ink/90 cursor-pointer"
        >
          Guardar en el Diccionario
        </button>

        {mensaje && <p className="text-xs text-green-600 font-bold text-center mt-2">{mensaje}</p>}
      </form>
    </div>
  );
}