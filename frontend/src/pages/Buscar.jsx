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

// Función auxiliar para formatear el texto (Primera letra mayúscula, resto minúsculas)
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

          {/* Recuadro visible de Términos y Condiciones debajo del formulario */}
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

      {/* PASO 2 */}
      {paso === "rubros" && (
        <div>
          <div className="flex items-center justify-between border-b border-stone pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Seleccioná un rubro</h1>
              <p className="text-sm text-ink/60">Hola, <strong>{nombreCliente}</strong>. Elegí el servicio que necesitás:</p>
            </div>
            <button onClick={() => setPaso("datos")} className="text-xs text-copper hover:underline cursor-pointer">
              Cambiar mis datos
            </button>
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

      {/* PASO 3 */}
      {paso === "resultados" && (
        <div>
          {/* Cabecera adaptada con botón grande y llamativo */}
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

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              {profesionalesFiltrados.length === 0 && (
                <div className="rounded-sm border border-stone bg-white p-6 text-center">
                  <p className="text-sm text-ink/50">No hay profesionales aprobados en este rubro todavía.</p>
                </div>
              )}

              {profesionalesFiltrados.map((p, index) => {
                const telWp = p.whatsapp || p.telefono || "";
                const mensajeWp = encodeURIComponent(`Hola ${p.nombre_completo || p.nombre}, te contacto desde ConectaOficios. Necesito tus servicios.`);
                const linkWhatsapp = telWp ? `https://wa.me/${telWp.replace(/\D/g, '')}?text=${mensajeWp}` : "#";

                return (
                  <div key={p.id} className="rounded-sm border border-stone bg-white p-5 shadow-sm relative">
                    <span className="absolute top-4 right-4 rounded-full bg-copper/10 px-2.5 py-1 font-mono text-xs font-bold text-copper-dark">
                      #{index + 1} más cercano ({p.distanciaKm.toFixed(1)} km)
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink">{p.nombre_completo || p.nombre}</h2>
                    <p className="text-xs uppercase tracking-wide text-stone-dark font-medium mt-0.5">
                      {p.direccion}, {p.localidad || "Unquillo"}
                    </p>

                    {/* Descripción de los servicios del profesional */}
                    {p.descripcion && (
                      <p className="text-xs text-ink/80 mt-2 bg-stone/5 p-2 rounded-sm border border-stone/30">
                        <strong>Servicios:</strong> {p.descripcion}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-ink/70">WhatsApp: <strong>{telWp || "No especificado"}</strong></p>
                    
                    {telWp && (
                      <a
                        href={linkWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center justify-center w-full rounded-sm bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 transition cursor-pointer"
                      >
                        💬 Contactar por WhatsApp
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-[500px] overflow-hidden rounded-sm border border-stone bg-white shadow-sm">
              <MapView profesionales={profesionalesFiltrados} centroCliente={ubicacionCliente} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}