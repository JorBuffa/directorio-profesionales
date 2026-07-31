import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient.js";
import MapView from "../components/MapView.jsx";

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

function capitalizarTexto(texto) {
  if (!texto) return "";
  const limpio = texto.trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

export default function Buscar() {
  const [paso, setPaso] = useState("rubros");
  const [ubicacionCliente, setUbicacionCliente] = useState(null);
  const [rubros, setRubros] = useState([]);
  const [rubrosSeleccionadosIds, setRubrosSeleccionadosIds] = useState([]); 
  const [profesionales, setProfesionales] = useState([]);
  const [sinonimosDinamicos, setSinonimosDinamicos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [filtroTextoLibreCoincidencia, setFiltroTextoLibreCoincidencia] = useState("");
  const [textoBusquedaLibre, setTextoBusquedaLibre] = useState("");
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);

  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        const { data: dataRubros } = await supabase.from('rubros').select('*');
        if (dataRubros) setRubros(dataRubros);

        const { data: dataSinonimos } = await supabase.from('diccionario_sinonimos').select('*');
        if (dataSinonimos) setSinonimosDinamicos(dataSinonimos);

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

  function handleSeleccionarRubroUnico(rubroId) {
    setRubrosSeleccionadosIds([rubroId]);
    setFiltroTextoLibreCoincidencia("");
    ejecutarUbicacionYPasar();
  }

  function ejecutarUbicacionYPasar() {
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

  function procesarBusquedaInteligente(texto) {
    const textoMinuscula = texto.toLowerCase();
    // Convertimos el texto en un array de palabras limpias para evaluar concordancias exactas de palabras
    const palabrasTexto = textoMinuscula.replace(/[^\w\sáéíóúñ]/gi, '').split(/\s+/);
    const idsEncontrados = [];

    // Función auxiliar para verificar si alguna palabra clave coincide como palabra completa o frase exacta
    function contieneTermino(termino) {
      const termLower = termino.toLowerCase();
      if (termLower.includes(' ')) {
        return textoMinuscula.includes(termLower);
      }
      return palabrasTexto.includes(termLower);
    }

    // 0. BUSCAR PRIMERO EN EL DICCIONARIO DINÁMICO (EDUCADO DESDE EL ADMIN)
    sinonimosDinamicos.forEach(item => {
      if (item.palabra) {
        const palabraClave = item.palabra.toLowerCase().trim();
        // Si la palabra clave tiene espacios o la palabra exacta está en el array
        const coincide = palabraClave.includes(' ') 
          ? textoMinuscula.includes(palabraClave) 
          : palabrasTexto.includes(palabraClave);

        if (coincide) {
          if (item.rubro_id && !idsEncontrados.includes(item.rubro_id)) {
            idsEncontrados.push(item.rubro_id);
          }
        }
      }
    });

    if (idsEncontrados.length > 0) {
      return [...new Set(idsEncontrados)];
    }

    // 1. DISEÑADOR / DISEÑO / GRÁFICA / 3D / VOLANTES
    const esBusquedaDeDiseno = 
      palabrasTexto.some(p => ["diseño", "diseñador", "diseñar", "flyer", "volante", "tarjeta", "logo", "cartel", "publicidad", "grafico", "3d"].includes(p)) ||
      textoMinuscula.includes("producto 3d");

    if (esBusquedaDeDiseno) {
      rubros.forEach(r => {
        const nombreR = r.nombre.toLowerCase();
        if (
          nombreR.includes("diseñ") || nombreR.includes("grafic") || 
          nombreR.includes("publicidad")
        ) {
          if (!nombreR.includes("electrónica") && !nombreR.includes("electronica")) {
            idsEncontrados.push(r.id);
          }
        }
      });
    }

    // 2. ELECTRÓNICA / EQUIPOS DE MÚSICA / AUDIO / ESTÉREO / AMPLIFICADOR / TV / PANTALLA
    const esBusquedaDeElectronica = 
      palabrasTexto.some(p => ["electrónica", "electronica", "audio", "parlante", "musica", "música", "estéreo", "estereo", "amplificador", "tv", "tele", "televisor", "pantalla"].includes(p)) ||
      textoMinuscula.includes("equipo de música") || textoMinuscula.includes("equipo de musica");

    if (esBusquedaDeElectronica) {
      rubros.forEach(r => {
        const nombreR = r.nombre.toLowerCase();
        if (nombreR.includes("electrónica") || nombreR.includes("electronica")) {
          idsEncontrados.push(r.id);
        }
      });
    }

    // 3. INFORMÁTICA / COMPUTACIÓN / ACCESORIOS / MOUSE / EXCEL / OFIMÁTICA / PROGRAMACIÓN / WEB
    const esBusquedaDeInformatica = 
      palabrasTexto.some(p => ["computación", "computacion", "informática", "informatica", "computadora", "pc", "notebook", "ordenador", "laptop", "mouse", "teclado", "excel", "planilla", "ofimática", "ofimatica", "programa", "programar", "web", "app", "aplicación", "impresora", "wifi", "cpu"].includes(p)) ||
      textoMinuscula.includes("diseño web");

    if (esBusquedaDeInformatica) {
      rubros.forEach(r => {
        const nombreR = r.nombre.toLowerCase();
        if (nombreR.includes("informát") || nombreR.includes("informat") || nombreR.includes("comput")) {
          idsEncontrados.push(r.id);
        }
      });
    }

    // 4. PLOMERÍA / PLOMERO
    if (palabrasTexto.some(p => ["plomero", "plomería", "plomeria", "canilla", "agua", "fuga", "pérdida", "perdida", "inodoro", "caño", "gotera"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("plom"));
      if (match) idsEncontrados.push(match.id);
    }

    // 5. ELECTRICIDAD / ELECTRICISTA
    if (palabrasTexto.some(p => ["electricista", "electricidad", "luz", "cable", "corto", "enchufe", "foco", "térmica", "termica", "cortocircuito"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("electric"));
      if (match) idsEncontrados.push(match.id);
    }

    // 6. ALBAÑILERÍA / ALBAÑIL
    if (palabrasTexto.some(p => ["albañil", "albanil", "albañilería", "albanileria", "pared", "humedad", "piso", "techo", "ladrillo", "construccion", "construcción"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("albañil") || r.nombre.toLowerCase().includes("albanil"));
      if (match) idsEncontrados.push(match.id);
    }

    // 7. JARDINERÍA / JARDINERO / PARQUERO / PASTO
    if (palabrasTexto.some(p => ["jardin", "jardín", "jardinero", "parquero", "pasto", "césped", "cesped", "parquiza", "poda"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("jardin") || r.nombre.toLowerCase().includes("parquiza"));
      if (match) idsEncontrados.push(match.id);
    }

    // 8. GASISTA / GAS
    if (palabrasTexto.some(p => ["gas", "gasista", "estufa", "calefón", "calefon", "termotanque", "cocina"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("gas"));
      if (match) idsEncontrados.push(match.id);
    }

    // 9. PASTELERÍA / PASTELERO / DONAS / MINI DONAS / BUDÍN
    if (
      palabrasTexto.some(p => ["pastel", "pastelero", "pastelería", "pasteleria", "budín", "budin", "torta", "pan", "dulce", "postre", "repostería", "reposteria", "dona", "donas", "donna", "donnas", "donut", "donuts"].includes(p)) ||
      textoMinuscula.includes("mini dona") || textoMinuscula.includes("mini donas") || textoMinuscula.includes("minidona") || textoMinuscula.includes("minidonas")
    ) {
      const match = rubros.find(r => {
        const nom = r.nombre.toLowerCase();
        return nom.includes("pasteler") || nom.includes("panader") || nom.includes("reposteri");
      });
      if (match) idsEncontrados.push(match.id);
    }

    // 10. ESTILISTA / UÑAS / PESTAÑAS / BELLEZA
    if (palabrasTexto.some(p => ["estilista", "uñas", "uñas", "pestaña", "pestañas", "peluquería", "peluqueria", "peluquero", "maquillaje", "belleza"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("estilis") || r.nombre.toLowerCase().includes("peluquer") || r.nombre.toLowerCase().includes("belleza"));
      if (match) idsEncontrados.push(match.id);
    }

    // 11. REFRIGERACIÓN / AIRE ACONDICIONADO / HELADERA / FREEZER
    if (palabrasTexto.some(p => ["refrigeración", "refrigeracion", "heladera", "freezer"].includes(p)) || textoMinuscula.includes("aire acondicionado")) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("refrigerac") || r.nombre.toLowerCase().includes("aire"));
      if (match) idsEncontrados.push(match.id);
    }

    // 12. PINTURA / PINTOR
    if (palabrasTexto.some(p => ["pintor", "pintura", "pintar", "cielorraso"].includes(p))) {
      const match = rubros.find(r => r.nombre.toLowerCase().includes("pintor"));
      if (match) idsEncontrados.push(match.id);
    }

    // 13. Búsqueda genérica por nombre de rubro directo
    if (idsEncontrados.length === 0) {
      rubros.forEach(r => {
        const nombreRubro = r.nombre.toLowerCase();
        if (palabrasTexto.some(p => nombreRubro.includes(p) && p.length > 3)) {
          idsEncontrados.push(r.id);
        }
      });
    }

    // 14. Búsqueda en descripciones de profesionales en Supabase
    if (idsEncontrados.length === 0) {
      const profesionalesQueCoinciden = profesionales.filter(p => {
        const desc = (p.descripcion || "").toLowerCase();
        const nombreProf = (p.nombre_completo || p.nombre || "").toLowerCase();
        return palabrasTexto.some(p => p.length > 3 && (desc.includes(p) || nombreProf.includes(p)));
      });

      if (profesionalesQueCoinciden.length > 0) {
        profesionalesQueCoinciden.forEach(p => {
          p.profesional_rubros?.forEach(pr => {
            if (pr.rubros?.id) idsEncontrados.push(pr.rubros.id);
          });
        });
      }
    }

    return [...new Set(idsEncontrados)];
  }

  function handleBusquedaInteligenteSubmit(e) {
    if (e) e.preventDefault();
    const textoLimpio = textoBusquedaLibre.trim();
    if (!textoLimpio) return;

    const idsEncontrados = procesarBusquedaInteligente(textoLimpio);

    if (idsEncontrados.length > 0) {
      setRubrosSeleccionadosIds(idsEncontrados);
      setFiltroTextoLibreCoincidencia(textoLimpio.toLowerCase());
      ejecutarUbicacionYPasar();
    } else {
      alert(`No encontramos profesionales ni rubros asociados a "${textoLimpio}". Por favor, revisá los botones de rubros que hay más abajo en la lista.`);
    }
  }

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
      
      const idsEncontrados = procesarBusquedaInteligente(transcripcion);
      if (idsEncontrados.length > 0) {
        setRubrosSeleccionadosIds(idsEncontrados);
        setFiltroTextoLibreCoincidencia(transcripcion.toLowerCase());
        ejecutarUbicacionYPasar();
      } else {
        alert(`No encontramos un rubro o servicio directo para "${transcripcion}". Por favor, seleccioná un rubro de la lista de botones.`);
      }
    };
    recognition.onerror = () => setEscuchandoVoz(false);
    recognition.onend = () => setEscuchandoVoz(false);

    recognition.start();
  }

  const profesionalesFiltrados = profesionales
    .filter(p => {
      const perteneceRubro = p.profesional_rubros?.some(pr => rubrosSeleccionadosIds.includes(pr.rubros?.id));
      return perteneceRubro;
    })
    .map((p, index) => {
      const latProf = p.lat || p.latitud || (-31.2333 + (index * 0.002));
      const lngProf = p.lng || p.longitud || p.lon || (-64.3167 - (index * 0.002));
      const dist = ubicacionCliente ? calcularDistancia(ubicacionCliente.lat, ubicacionCliente.lng, latProf, lngProf) : 0.5;
      return { ...p, latFinal: latProf, lngFinal: lngProf, distanciaKm: dist !== null ? dist : 0.5 };
    })
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      
      {paso === "rubros" && (
        <div>
          <div className="flex items-center justify-between border-b border-stone pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Buscá un servicio</h1>
              <p className="text-sm text-ink/60">Hablanos, escribí tu problema o elegí un rubro:</p>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-b from-copper/10 to-copper/5 border-2 border-copper/30 p-6 rounded-lg max-w-xl mx-auto shadow-sm text-center">
            
            <span className="block text-xs font-bold uppercase tracking-wider text-copper mb-4">
              🎙️ Toca el micrófono para hablar
            </span>
            
            <div className="flex justify-center mb-6">
              <button
                type="button"
                onClick={iniciarEscuchaDeVoz}
                title="Toca para hablar"
                className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition transform hover:scale-105 cursor-pointer ${
                  escuchandoVoz 
                    ? "bg-red-600 text-white animate-ping" 
                    : "bg-copper text-paper hover:bg-copper/90"
                }`}
              >
                🎤
              </button>
            </div>
            
            {escuchandoVoz && (
              <p className="text-xs text-red-600 font-bold animate-pulse mb-4">
                🔴 Escuchando... Decí lo que necesitás.
              </p>
            )}

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-copper/20"></div>
              <span className="flex-shrink mx-3 text-[11px] uppercase font-bold text-stone-dark">O escribí abajo</span>
              <div className="flex-grow border-t border-copper/20"></div>
            </div>

            <form onSubmit={handleBusquedaInteligenteSubmit} className="relative flex items-center">
              <input
                type="text"
                value={textoBusquedaLibre}
                onChange={(e) => setTextoBusquedaLibre(e.target.value)}
                placeholder="Ej: Necesito mini donas, un plomero, pintor..."
                className="w-full rounded-sm border border-stone bg-white px-3 py-3 pr-20 text-ink focus:border-copper focus:outline-none text-xs"
              />
              <button
                type="submit"
                className="absolute right-1 inset-y-1 bg-copper text-paper px-4 rounded-sm text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-dark mb-4 text-center">
              O seleccioná un rubro directamente:
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {rubros.map((r) => (
                <button
                  key={r.id}
                  disabled={cargando}
                  onClick={() => handleSeleccionarRubroUnico(r.id)}
                  className="flex flex-col items-center justify-center rounded-sm border border-stone bg-white p-6 shadow-sm transition hover:border-copper hover:bg-copper/5 cursor-pointer"
                >
                  <span className="font-display font-semibold text-ink text-center">
                    {capitalizarTexto(r.nombre)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {cargando && (
            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-copper animate-pulse">Obteniendo ubicación y ordenando cercanos...</p>
            </div>
          )}
        </div>
      )}

      {paso === "resultados" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone pb-3 gap-3">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Profesionales más cercanos</h1>
              <p className="text-xs sm:text-sm text-ink/60">Resultados ordenados por cercanía.</p>
            </div>
            <button
              onClick={() => {
                setRubrosSeleccionadosIds([]);
                setTextoBusquedaLibre("");
                setFiltroTextoLibreCoincidencia("");
                setPaso("rubros");
              }}
              className="w-full sm:w-auto rounded-lg bg-copper px-4 py-2.5 text-xs sm:text-sm font-bold text-paper shadow-md hover:bg-copper/90 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              🔍 Elegir otro rubro
            </button>
          </div>

          <div className="h-[45vh] sm:h-[450px] w-full overflow-hidden rounded-lg border border-stone bg-white shadow-sm relative touch-pan-y">
            <MapView profesionales={profesionalesFiltrados} centroCliente={ubicacionCliente} />
          </div>

          <div className="text-center py-1 sm:hidden">
            <span className="text-[11px] text-stone-dark font-medium bg-stone/20 px-3 py-1 rounded-full">
              👆 Deslizá hacia arriba para ver las fichas
            </span>
          </div>

          <div className="pt-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-ink mb-3">Listado de profesionales encontrados</h2>

            {profesionalesFiltrados.length === 0 ? (
              <div className="rounded-sm border border-stone bg-white p-6 text-center">
                <p className="text-sm text-ink/50">No hay profesionales en la zona para este servicio específico.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {profesionalesFiltrados.map((p, index) => {
                  const telWp = p.whatsapp || p.telefono || "";
                  const mensajeWp = encodeURIComponent(`Hola ${p.nombre_completo || p.nombre}, te contacto desde ConectaOficios. Necesito tus servicios.`);
                  const linkWhatsapp = telWp ? `https://wa.me/${telWp.replace(/\D/g, '')}?text=${mensajeWp}` : "#";

                  return (
                    <div key={p.id} className="rounded-sm border border-stone bg-white p-4 sm:p-5 shadow-sm relative flex flex-col justify-between">
                      <div>
                        <span className="absolute top-4 right-4 rounded-full bg-copper/10 px-2.5 py-1 font-mono text-xs font-bold text-copper-dark">
                          #{index + 1} ({p.distanciaKm.toFixed(1)} km)
                        </span>
                        <h3 className="font-display text-base sm:text-lg font-bold text-ink pr-16">{p.nombre_completo || p.nombre}</h3>
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