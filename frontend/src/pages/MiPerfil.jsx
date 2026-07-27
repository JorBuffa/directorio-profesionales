import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient.js";

export default function MiPerfil() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Listas y datos del perfil
  const [userIdLogueado, setUserIdLogueado] = useState(null);
  const [listaRubros, setListaRubros] = useState([]);
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [rubroIdSeleccionado, setRubroIdSeleccionado] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("");

  // Estados para la gestión de archivos adjuntos del Storage
  const [archivosStorage, setArchivosStorage] = useState([]);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  useEffect(() => {
    async function cargarDatosPerfil() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          navigate("/soy-profesional");
          return;
        }

        const userId = session.user.id;
        setUserIdLogueado(userId);

        // 1. Cargar todos los rubros disponibles para el selector
        const { data: rubrosData } = await supabase.from("rubros").select("*");
        if (rubrosData) setListaRubros(rubrosData);

        // 2. Cargar datos del profesional
        const { data: profData, error: profError } = await supabase
          .from("profesionales")
          .select("*")
          .eq("id", userId)
          .single();

        if (profError) {
          console.error("Error al cargar perfil:", profError);
        } else if (profData) {
          setNombreCompleto(profData.nombre_completo || "");
          setWhatsapp(profData.whatsapp || "");
          setDireccion(profData.direccion || "");
          setLocalidad(profData.localidad || "");
          setLatitud(profData.latitud ?? "");
          setLongitud(profData.longitud ?? "");
          setDescripcion(profData.descripcion || "");
          setEstado(profData.estado || "pendiente");
        }

        // 3. Cargar el rubro actual de la tabla intermedia profesional_rubros
        const { data: relData } = await supabase
          .from("profesional_rubros")
          .select("rubro_id")
          .eq("profesional_id", userId)
          .single();

        if (relData) {
          setRubroIdSeleccionado(relData.rubro_id);
        }

        // 4. Cargar documentos del Storage asociados a este usuario
        await cargarArchivosStorage(userId);

      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }

    cargarDatosPerfil();
  }, [navigate]);

  async function cargarArchivosStorage(userId) {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .list('', { limit: 100 });

      if (!error && data) {
        // Filtramos los archivos que incluyan el ID del profesional en su nombre
        const matches = data.filter(file => file.name.includes(userId));

        const archivosConUrl = matches.map((file) => {
          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(file.name);
          return {
            nombre: file.name,
            url: urlData.publicUrl
          };
        });

        setArchivosStorage(archivosConUrl);
      }
    } catch (err) {
      console.error("Error al listar archivos del storage:", err);
    }
  }

  // Borrar un archivo del Storage
  async function handleEliminarArchivo(nombreArchivo) {
    if (!window.confirm("¿Estás seguro de querer eliminar este documento?")) return;

    try {
      const { error } = await supabase.storage
        .from('documentos')
        .remove([nombreArchivo]);

      if (error) throw error;

      setArchivosStorage(prev => prev.filter(f => f.nombre !== nombreArchivo));
      alert("Documento eliminado correctamente.");
    } catch (err) {
      alert("Error al eliminar el archivo: " + err.message);
    }
  }

  // Subir un nuevo archivo y cambiar el estado a pendiente
  async function handleSubirNuevoArchivo(e) {
    e.preventDefault();
    if (!nuevoArchivo || !userIdLogueado) return;

    setSubiendoArchivo(true);
    try {
      const fileExt = nuevoArchivo.name.split('.').pop();
      const fileName = `${userIdLogueado}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, nuevoArchivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      // Actualizamos la base de datos (guardando la URL opcional y pasando estado a 'pendiente')
      const { error: updateError } = await supabase
        .from("profesionales")
        .update({
          documentacion_url: urlData.publicUrl,
          estado: 'pendiente'
        })
        .eq("id", userIdLogueado);

      if (updateError) throw updateError;

      setEstado('pendiente');
      alert("¡Documento subido con éxito! Tu perfil fue enviado nuevamente a revisión.");
      setNuevoArchivo(null);
      await cargarArchivosStorage(userIdLogueado);

    } catch (err) {
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  // Función para buscar coordenadas automáticamente con OpenStreetMap (Nominatim)
  async function handleUbicarDireccion() {
    if (!direccion || !localidad) {
      setMensaje("Por favor completa la dirección y la localidad antes de ubicar.");
      return;
    }

    setGeocodificando(true);
    setMensaje("");

    try {
      const query = encodeURIComponent(`${direccion}, ${localidad}, Córdoba, Argentina`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setLatitud(lat);
        setLongitud(lon);
        setMensaje("¡Ubicación encontrada con éxito! No olvides guardar los cambios.");
      } else {
        setMensaje("No se encontró la dirección exacta en el mapa. Prueba ajustando el texto.");
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error al conectar con el servicio de geolocalización.");
    } finally {
      setGeocodificando(false);
    }
  }

  async function handleActualizar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Actualizar datos básicos y coordenadas en 'profesionales'
      const { error: errorProf } = await supabase
        .from("profesionales")
        .update({
          nombre_completo: nombreCompleto,
          whatsapp: whatsapp,
          direccion: direccion,
          localidad: localidad,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          descripcion: descripcion,
        })
        .eq("id", userId);

      if (errorProf) throw errorProf;

      // Actualizar o insertar el rubro en la tabla intermedia 'profesional_rubros'
      const { data: existingRel } = await supabase
        .from("profesional_rubros")
        .select("id")
        .eq("profesional_id", userId)
        .single();

      if (existingRel) {
        await supabase
          .from("profesional_rubros")
          .update({ rubro_id: rubroIdSeleccionado })
          .eq("profesional_id", userId);
      } else {
        await supabase
          .from("profesional_rubros")
          .insert([{ profesional_id: userId, rubro_id: rubroIdSeleccionado }]);
      }

      setMensaje("¡Perfil actualizado con éxito!");
    } catch (err) {
      console.error(err);
      setMensaje("Error al actualizar: " + (err.message || "Error desconocido"));
    } finally {
      setGuardando(false);
    }
  }

  async function handleCerrarSesion() {
    await supabase.auth.signOut();
    navigate("/soy-profesional");
  }

  if (cargando) {
    return <div className="text-center py-12 text-ink/60">Cargando tu perfil...</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 space-y-6">
      <div className="rounded-sm border border-stone bg-white p-8 shadow-sm">
        <div className="flex justify-between items-center border-b border-stone pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Mi Perfil Profesional</h1>
            <p className="text-xs text-copper font-medium mt-1 uppercase tracking-wider">
              Estado de cuenta: <span className="font-bold">{estado}</span>
            </p>
          </div>
          <button
            onClick={handleCerrarSesion}
            className="text-xs text-red-600 hover:underline border border-red-200 px-3 py-1.5 rounded-sm cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>

        <form onSubmit={handleActualizar} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Nombre y Apellido</label>
            <input
              type="text"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">WhatsApp</label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Rubro / Oficio</label>
            <select
              required
              value={rubroIdSeleccionado}
              onChange={(e) => setRubroIdSeleccionado(e.target.value)}
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none bg-white"
            >
              <option value="">Selecciona un rubro...</option>
              {listaRubros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre || r.titulo || r.descripcion || r.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Dirección</label>
            <input
              type="text"
              required
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Localidad</label>
            <input
              type="text"
              required
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
            />
          </div>

          {/* Botón y campos de geolocalización */}
          <div className="rounded-sm bg-stone/20 p-4 border border-stone/50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium uppercase tracking-wider text-ink/70">Geolocalización en el mapa</span>
              <button
                type="button"
                onClick={handleUbicarDireccion}
                disabled={geocodificando}
                className="rounded-sm bg-ink text-paper text-xs px-3 py-1.5 font-medium hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {geocodificando ? "Buscando..." : "📍 Ubicar en el mapa"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink/60">Latitud</label>
                <input
                  type="text"
                  readOnly
                  value={latitud}
                  placeholder="Automático"
                  className="mt-1 w-full rounded-sm border border-stone bg-white px-2 py-1 text-xs text-ink/80"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink/60">Longitud</label>
                <input
                  type="text"
                  readOnly
                  value={longitud}
                  placeholder="Automático"
                  className="mt-1 w-full rounded-sm border border-stone bg-white px-2 py-1 text-xs text-ink/80"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Descripción de Servicios</label>
            <textarea
              rows="3"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-sm bg-copper py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
          >
            {guardando ? "Guardando cambios..." : "Guardar Cambios"}
          </button>

          {mensaje && (
            <p className={`text-sm text-center mt-2 ${mensaje.includes("éxito") ? "text-green-600" : "text-red-600"}`}>
              {mensaje}
            </p>
          )}
        </form>
      </div>

      {/* SECCIÓN DE GESTIÓN DE DOCUMENTACIÓN */}
      <div className="rounded-sm border border-stone bg-white p-8 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-copper">Gestión de Documentación</h2>
        <p className="text-xs text-ink/65">Visualizá tus documentos actuales, eliminalos si están desactualizados o subí un archivo nuevo para reactivar tu cuenta.</p>

        <div className="space-y-2">
          {archivosStorage.length > 0 ? (
            archivosStorage.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-sm border border-stone bg-stone/5 p-3">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-taller underline truncate max-w-[240px]"
                >
                  📄 {file.nombre}
                </a>
                <button
                  type="button"
                  onClick={() => handleEliminarArchivo(file.nombre)}
                  className="rounded-sm bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-ink/40 italic">No hay documentos cargados en el storage.</p>
          )}
        </div>

        <form onSubmit={handleSubirNuevoArchivo} className="mt-4 border-t border-stone pt-4 space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">
            Subir nuevo documento de actualización
          </label>
          <input
            type="file"
            onChange={(e) => setNuevoArchivo(e.target.files[0])}
            className="w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
          />
          <button
            type="submit"
            disabled={!nuevoArchivo || subiendoArchivo}
            className="w-full rounded-sm bg-taller py-2 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {subiendoArchivo ? "Subiendo..." : "Subir archivo y enviar a revisión"}
          </button>
        </form>
      </div>
    </div>
  );
}