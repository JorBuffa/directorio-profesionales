import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient.js";
import MapView from "../components/MapView.jsx";

// Diccionario inteligente ampliado para interpretar problemas cotidianos (incluyendo tecnología e informática)
const diccionarioRubros = {
  plomero: ["canilla", "agua", "fuga", "pérdida", "inodoro", "tubo", "caño", "desagüe", "gotera", "tanque", "bomba", "plomeria"],
  gasista: ["gas", "estufa", "calefón", "termotanque", "cocina", "fuga de gas", "valvula", "medidor"],
  electricista: ["luz", "corto", "enchufes", "foco", "térmica", "disyuntor", "cable", "apagón", "electricidad", "toma", "corriente"],
  albanil: ["pared", "humedad", "piso", "techo", "revoque", "ladrillo", "cemento", "grieta", "ampliación", "construccion"],
  pintor: ["pintura", "paredes", "humedad", "impermeabilizar", "latex", "manchas", "cielorraso", "pintar"],
  "técnico informático": ["computadora", "pc", "notebook", "pantalla", "celular", "impresora", "internet", "wifi", "virus", "tecnologia", "sistema", "tecnico"],
  computación: ["computadora", "pc", "notebook", "pantalla", "celular", "impresora", "internet", "wifi", "virus", "tecnologia", "sistema", "tecnico"]
};

function interpretarBusqueda(textoIngresado) {
  if (!textoIngresado) return "";
  const textoMinuscula = textoIngresado.toLowerCase();
  for (const [rubro, palabrasClave] of Object.entries(diccionarioRubros)) {
    const coincide = palabrasClave.some(palabra => textoMinuscula.includes(palabra));
    if (coincide) {
      return rubro;
    }
  }
  return textoIngresado;
}

// Función para calcular la distancia en kilómetros (Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Función auxiliar para formatear el texto
function capitalizarTexto(texto) {
  if (!texto) return "";
  const limpio = texto.trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

export default function Buscar() {
  const [paso, setPaso] = useState("datos");
  
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [ubicacionCliente, setUbicacionCliente] = useState(null);

  const [rubros, setRubros] = useState([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState(null);
  const [profesionales, setProfesionales] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados para el Buscador Inteligente por Texto / Voz
  const [textoBusquedaLibre, setTextoBusquedaLibre] = useState("");
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);

  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        const { data: dataRubros } = await supabase.from('rubros').select('*');
        if (dataRubros) setRubros(dataRubros);

        const { data: dataProf } = await supabase
          .from('profesionales')
          .select(`
            *,
            profesional_rubros (
              rubros (
                id,
                nombre
              )
            )
          `)
          .eq('estado', 'aprobado');

        if (dataProf) setProfesionales(dataProf);
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    }
    cargarDatosIniciales();
  }, []);

  function handleIniciarBusqueda(e) {
    e.preventDefault();
    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      alert("Por favor, ingresa tu nombre y número de teléfono.");
      return;
    }
    setPaso("rubros");
  }

  function handleSeleccionarRubro(rubroId) {
    setRubroSeleccionado(rubroId);
    setCargando(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUbicacionCliente({ lat, lng });
          setCargando(false);
          setPaso("resultados");
        },
        (error) => {
          console.warn("Geolocalización no disponible, usando centro de Unquillo:", error.message);
          setUbicacionCliente({ lat: -31.2333, lng: -64.3167 });
          setCargando(false);
          setPaso("resultados");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setUbicacionCliente({ lat: -31.2333, lng: -64.3167 });
      setCargando(false);
      setPaso("resultados");
    }
  }

  // Función robusta para mapear el texto libre al rubro correcto de Supabase
  function procesarTextoBúsqueda(texto) {
    const textoMinuscula = texto.toLowerCase();
    
    if (textoMinuscula.includes("canilla") || textoMinuscula.includes("agua") || textoMinuscula.includes("fuga") || textoMinuscula.includes("pérdida") || textoMinuscula.includes("inodoro") || textoMinuscula.includes("caño") || textoMinuscula.includes("gotera") || textoMinuscula.includes("plomeria")) {
      return rubros.find(r => r.nombre.toLowerCase().includes("plom"));
    }
    if (textoMinuscula.includes("gas") || textoMinuscula.includes("estufa") || textoMinuscula.includes("calefón") || textoMinuscula.includes("termotanque") || textoMinuscula.includes("cocina")) {
      return rubros.find(r => r.nombre.toLowerCase().includes("gas"));
    }
    if (textoMinuscula.includes("luz") || textoMinuscula.includes("corto") || textoMinuscula.includes("enchufe") || textoMinuscula.includes("foco") || textoMinuscula.includes("térmica") || textoMinuscula.includes("electricidad")) {
      return rubros.find(r => r.nombre.toLowerCase().includes("electric"));
    }
    if (textoMinuscula.includes("pared") || textoMinuscula.includes("humedad") || textoMinuscula.includes("piso") || textoMinuscula.includes("techo") || textoMinuscula.includes("ladrillo") || textoMinuscula.includes("construccion")) {
      return rubros.find(r => r.nombre.toLowerCase().includes("albañil") || r.nombre.toLowerCase().includes("albanil"));
    }
    if (textoMinuscula.includes("pintura") || textoMinuscula.includes("pintar") || textoMinuscula.includes("cielorraso")) {
      return rubros.find(r => r.nombre.toLowerCase().includes("pintor"));
    }
    if (textoMinuscula.includes("computadora") || textoMinuscula.includes("pc") || textoMinuscula.includes("notebook") || textoMinuscula.includes("pantalla") || textoMinuscula.includes("celular") || textoMinuscula.includes("impresora") || textoMinuscula.includes("wifi")) {
      return rubros.find(r => r.nombre.toLowerCase().includes("informát") || r.nombre.toLowerCase().includes("comput") || r.nombre.toLowerCase().includes("tecn"));
    }

    // Coincidencia genérica si escribe el nombre directo
    return rubros.find(r => r.nombre.toLowerCase().includes(textoMinuscula));
  }

  // Función para manejar la búsqueda inteligente por texto
  function handleBusquedaInteligenteSubmit(e) {
    if (e) e.preventDefault();
    if (!textoBusquedaLibre.trim()) return;

    const rubroEncontrado = procesarTextoBúsqueda(textoBusquedaLibre);

    if (rubroEncontrado) {
      handleSeleccionarRubro(rubroEncontrado.id);
    } else {
      alert(`No encontramos un rubro asociado a "${textoBusquedaLibre}". Por favor selecciona un rubro de la lista.`);
    }
  }

  // Activar micrófono nativo del navegador
  function iniciarEscuchaDeVoz() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta búsqueda por voz. Por favor escribe tu consulta.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setEscuchandoVoz(true);
    recognition.onresult = (event) => {
      const transcripcion = event.results[0][0].transcript;
      setTextoBusquedaLibre(transcripcion);
      setEscuchandoVoz(false);
      
      const rubroEncontrado = procesarTextoBúsqueda(transcripcion);
      if (rubroEncontrado) {
        handleSeleccionarRubro(rubroEncontrado.id);
      } else {
        alert(`No encontramos un rubro directo para "${transcripcion}". Por favor selecciona un rubro de la lista.`);
      }
    };
    recognition.onerror = () => setEscuchandoVoz(false);
    recognition.onend = () => setEscuchandoVoz(false);

    recognition.start();
  }

  // Asignar coordenadas válidas y cercanas si el profesional no las tiene guardadas en la BD
  const profesionalesFiltrados = profesionales
    .filter(p => p.profesional_rubros?.some(pr => pr.rubros?.id === rubroSeleccionado))
    .map((p, index) => {
      const latProf = p.lat || p.latitud || (-31.2333 + (index * 0.002));
      const lngProf = p.lng || p.longitud || p.lon || (-64.3167 - (index * 0.002));
      
      const dist = ubicacionCliente ? calcularDistancia(ubicacionCliente.lat, ubicacionCliente.lng, latProf, lngProf) : 0.5;
      
      return { 
        ...p, 
        latFinal: latProf, 
        lngFinal: lngProf, 
        distanciaKm: dist !== null ? dist : 0.5 
      };
    })
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      
      {/* PASO 1 */}
      {paso === "datos" && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-md rounded-sm border border-stone bg-white p-8 shadow-sm">
            <h1 className="font-display text-2xl font-bold text-ink">Buscar profesional</h1>
            <p className="mt-1 text-sm text-ink/60">Ingresá tus datos para comenzar la búsqueda.</p>

            <form onSubmit={handleIniciarBusqueda} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Tu Nombre</label>
                <input
                  type="text"
                  required
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Número de Teléfono</label>
                <input
                  type="tel"
                  required
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Ej. 3511234567"
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-sm bg-taller py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
              >
                Continuar
              </button>
            </form>
          </div>

          <div className="w-full max-w-md mt-4 rounded-sm border border-stone/60 bg-stone/10 p-3 text-center">
            <p className="text-[11px] text-ink/70 leading-snug">
              Al continuar, aceptás nuestros{" "}
              <a 
                href="/terminos" 
                className="font-bold text-copper underline hover:text-ink cursor-pointer"
              >
                Términos y Condiciones
              </a>
              . ConectaOficios es una plataforma de intermediación tecnológica; no participamos ni nos responsabilizamos por los acuerdos o servicios prestados entre usuarios y profesionales.
            </p>
          </div>
        </div>
      )}

      {/* PASO 2: SELECCIONAR RUBRO + BUSCADOR INTELIGENTE POR VOZ/TEXTO */}
      {paso === "rubros" && (
        <div>
          <div className="flex items-center justify-between border-b border-stone pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Seleccioná un rubro</h1>
              <p className="text-sm text-ink/60">Hola, <strong>{nombreCliente}</strong>. Elegí el servicio que necesitás o describelo:</p>
            </div>
            <button onClick={() => setPaso("datos")} className="text-xs text-copper hover:underline cursor-pointer">
              Cambiar mis datos
            </button>
          </div>

          {/* BUSCADOR INTELIGENTE POR TEXTO O VOZ */}
          <div className="mt-6 bg-copper/5 border border-copper/30 p-4 rounded-sm max-w-xl mx-auto">
            <label className="block text-xs font-bold uppercase tracking-wider text-copper mb-1">
              ✨ Búsqueda inteligente por voz o palabras clave
            </label>
            <p className="text-[11px] text-ink/70 mb-3">
              Escribí o decí tu problema (Ej. <em>"Se me rompió la computadora"</em> o <em>"No tengo luz"</em>) y te conectamos al instante.
            </p>
            <form onSubmit={handleBusquedaInteligenteSubmit} className="relative flex items-center">
              <input
                type="text"
                value={textoBusquedaLibre}
                onChange={(e) => setTextoBusquedaLibre(e.target.value)}
                placeholder="¿Qué problema tenés para arreglar?"
                className="w-full rounded-sm border border-stone bg-white px-3 py-2.5 pr-20 text-ink focus:border-copper focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={iniciarEscuchaDeVoz}
                title="Buscar hablando"
                className={`absolute right-10 inset-y-0 px-2 flex items-center justify-center transition cursor-pointer text-base ${
                  escuchandoVoz ? "text-red-600 animate-pulse scale-110" : "text-ink/60 hover:text-copper"
                }`}
              >
                🎤
              </button>
              <button
                type="submit"
                className="absolute right-1 inset-y-1 bg-copper text-paper px-2.5 rounded-sm text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Ir
              </button>
            </form>
            {escuchandoVoz && (
              <p className="text-[10px] text-red-600 mt-1 font-semibold animate-pulse text-center">
                🔴 Escuchando... Habla cerca de tu micrófono.
              </p>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {rubros.map((r) => (
              <button
                key={r.id}
                disabled={cargando}
                onClick={() => handleSeleccionarRubro(r.id)}
                className="flex flex-col items-center justify-center rounded-sm border border-stone bg-white p-6 shadow-sm transition hover:border-copper hover:bg-copper/5 cursor-pointer"
              >
                <span className="font-display font-semibold text-ink text-center">
                  {capitalizarTexto(r.nombre)}
                </span>
              </button>
            ))}
          </div>

          {cargando && (
            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-copper animate-pulse">Obteniendo ubicación y ordenando cercanos...</p>
            </div>
          )}
        </div>
      )}

      {/* PASO 3: MAPA ARRIBA Y LISTADO DEBAJO */}
      {paso === "resultados" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone pb-4 gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Profesionales más cercanos</h1>
              <p className="text-sm text-ink/60">Resultados ordenados por cercanía para <strong>{nombreCliente}</strong>.</p>
            </div>
            <button
              onClick={() => setPaso("rubros")}
              className="w-full sm:w-auto rounded-xl bg-copper px-5 py-3 text-sm font-bold text-paper shadow-md hover:bg-copper/90 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              🔍 Elegir otro rubro
            </button>
          </div>

          {/* 1. MAPA GRANDE PRIMERO */}
          <div className="h-[450px] w-full overflow-hidden rounded-sm border border-stone bg-white shadow-sm">
            <MapView profesionales={profesionalesFiltrados} centroCliente={ubicacionCliente} />
          </div>

          {/* 2. LISTADO DE PROFESIONALES DEBAJO DEL MAPA */}
          <div>
            <h2 className="font-display text-xl font-bold text-ink mb-4">Listado de profesionales encontrados</h2>

            {profesionalesFiltrados.length === 0 ? (
              <div className="rounded-sm border border-stone bg-white p-6 text-center">
                <p className="text-sm text-ink/50">No hay profesionales aprobados en este rubro todavía.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {profesionalesFiltrados.map((p, index) => {
                  const telWp = p.whatsapp || p.telefono || "";
                  const mensajeWp = encodeURIComponent(`Hola ${p.nombre_completo || p.nombre}, te contacto desde ConectaOficios. Necesito tus servicios.`);
                  const linkWhatsapp = telWp ? `https://wa.me/${telWp.replace(/\D/g, '')}?text=${mensajeWp}` : "#";

                  return (
                    <div key={p.id} className="rounded-sm border border-stone bg-white p-5 shadow-sm relative flex flex-col justify-between">
                      <div>
                        <span className="absolute top-4 right-4 rounded-full bg-copper/10 px-2.5 py-1 font-mono text-xs font-bold text-copper-dark">
                          #{index + 1} ({p.distanciaKm.toFixed(1)} km)
                        </span>
                        <h3 className="font-display text-lg font-bold text-ink pr-16">{p.nombre_completo || p.nombre}</h3>
                        <p className="text-xs uppercase tracking-wide text-stone-dark font-medium mt-0.5">
                          {p.direccion}, {p.localidad || "Unquillo"}
                        </p>

                        {p.descripcion && (
                          <p className="text-xs text-ink/80 mt-2 bg-stone/5 p-2 rounded-sm border border-stone/30">
                            <strong>Servicios:</strong> {p.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone/40">
                        <p className="text-xs text-ink/70 mb-2">WhatsApp: <strong>{telWp || "No especificado"}</strong></p>
                        
                        {telWp && (
                          <a
                            href={linkWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full rounded-sm bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 transition cursor-pointer"
                          >
                            💬 Contactar por WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}