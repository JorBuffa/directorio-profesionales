import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";

export default function EditarPerfil() {
  const [identificador, setIdentificador] = useState("");
  const [profesional, setProfesional] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  
  // Estado para la gestión de archivos adjuntos del Storage
  const [archivosStorage, setArchivosStorage] = useState([]);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  // Cargar archivos del Storage cuando se selecciona un profesional
  useEffect(() => {
    async function obtenerArchivosDelStorage() {
      if (!profesional) {
        setArchivosStorage([]);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('documentos')
          .list('', { limit: 100 });

        if (!error && data) {
          const matches = data.filter(file => 
            file.name.includes(profesional.id) || 
            (profesional.email && file.name.toLowerCase().includes(profesional.email.toLowerCase().split('@')[0]))
          );

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
        } else {
          setArchivosStorage([]);
        }
      } catch (err) {
        console.error("Error al listar archivos del storage:", err);
        setArchivosStorage([]);
      }
    }

    obtenerArchivosDelStorage();
  }, [profesional]);

  // Buscar al profesional por email o teléfono/WhatsApp
  async function handleBuscar(e) {
    e.preventDefault();
    if (!identificador.trim()) return;
    setCargando(true);
    setMensaje("");

    try {
      const { data, error } = await supabase
        .from('profesionales')
        .select('*')
        .or(`email.eq.${identificador},whatsapp.eq.${identificador},telefono.eq.${identificador}`)
        .single();

      if (error || !data) {
        setMensaje("No se encontró ningún profesional con ese Email o WhatsApp.");
        setProfesional(null);
      } else {
        setProfesional(data);
      }
    } catch (err) {
      setMensaje("Ocurrió un error al buscar el perfil.");
    } finally {
      setCargando(false);
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

      // Actualizamos la lista visual filtrando el borrado
      setArchivosStorage(prev => prev.filter(f => f.nombre !== nombreArchivo));
      alert("Documento eliminado correctamente.");
    } catch (err) {
      alert("Error al eliminar el archivo: " + err.message);
    }
  }

  // Subir un nuevo archivo y cambiar estado a pendiente de revisión
  async function handleSubirNuevoArchivo(e) {
    e.preventDefault();
    if (!nuevoArchivo) return;

    setSubiendoArchivo(true);
    try {
      const fileExt = nuevoArchivo.name.split('.').pop();
      const fileName = `${profesional.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, nuevoArchivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      // Actualizamos también la base de datos (pasando el estado a pendiente para que el admin lo revise)
      const { error: updateError } = await supabase
        .from('profesionales')
        .update({
          documentacion_url: urlData.publicUrl,
          estado: 'pendiente' // Vuelve a pendiente para que el admin lo apruebe con la nueva doc
        })
        .eq('id', profesional.id);

      if (updateError) throw updateError;

      alert("¡Documento subido con éxito! Tu perfil ha sido enviado nuevamente a revisión.");
      
      // Actualizamos el estado local
      setProfesional(prev => ({ ...prev, estado: 'pendiente', documentacion_url: urlData.publicUrl }));
      setNuevoArchivo(null);

      // Refrescamos los archivos listados
      const { data: listData } = await supabase.storage.from('documentos').list('', { limit: 100 });
      if (listData) {
        const matches = listData.filter(file => file.name.includes(profesional.id));
        setArchivosStorage(matches.map(file => ({
          nombre: file.name,
          url: supabase.storage.from('documentos').getPublicUrl(file.name).data.publicUrl
        })));
      }

    } catch (err) {
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  // Guardar cambios generales del perfil
  async function handleGuardarCambios(e) {
    e.preventDefault();
    setCargando(true);

    try {
      const { error } = await supabase
        .from('profesionales')
        .update({
          nombre_completo: profesional.nombre_completo,
          whatsapp: profesional.whatsapp,
          direccion: profesional.direccion,
          localidad: profesional.localidad,
        })
        .eq('id', profesional.id);

      if (error) {
        alert("Error al actualizar los datos.");
      } else {
        alert("¡Tus datos fueron actualizados correctamente!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">Editar mi perfil profesional</h1>
      <p className="mt-1 text-sm text-ink/60">Actualizá tu dirección, teléfono o gestioná tu documentación requerida.</p>

      {!profesional ? (
        <form onSubmit={handleBuscar} className="mt-6 rounded-sm border border-stone bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">
              Ingresá tu Email o Número de WhatsApp registrado
            </label>
            <input
              type="text"
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Ej. 3511234567 o tu@email.com"
              className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-sm bg-taller py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
          >
            {cargando ? "Buscando..." : "Buscar mi perfil"}
          </button>

          {mensaje && <p className="text-sm text-red-600 mt-2">{mensaje}</p>}
        </form>
      ) : (
        <div className="mt-6 space-y-6">
          {/* FORMULARIO DE DATOS PERSONALES */}
          <form onSubmit={handleGuardarCambios} className="rounded-sm border border-stone bg-white p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-stone pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-copper">
                Estado actual: <span className="underline">{profesional.estado}</span>
              </span>
              <button
                type="button"
                onClick={() => setProfesional(null)}
                className="text-xs text-ink/50 hover:underline cursor-pointer"
              >
                Cambiar de cuenta
              </button>
            </div>

            {profesional.motivo_rechazo && (
              <div className="rounded-sm bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <strong>Motivo de suspensión / revisión:</strong> {profesional.motivo_rechazo}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Nombre Completo</label>
              <input
                type="text"
                value={profesional.nombre_completo || ""}
                onChange={(e) => setProfesional({ ...profesional, nombre_completo: e.target.value })}
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">WhatsApp / Teléfono</label>
              <input
                type="text"
                value={profesional.whatsapp || ""}
                onChange={(e) => setProfesional({ ...profesional, whatsapp: e.target.value })}
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Dirección</label>
              <input
                type="text"
                value={profesional.direccion || ""}
                onChange={(e) => setProfesional({ ...profesional, direccion: e.target.value })}
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Localidad</label>
              <input
                type="text"
                value={profesional.localidad || ""}
                onChange={(e) => setProfesional({ ...profesional, localidad: e.target.value })}
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-sm bg-copper py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
            >
              {cargando ? "Guardando..." : "Guardar Cambios de Perfil"}
            </button>
          </form>

          {/* SECCIÓN DE GESTIÓN DE DOCUMENTACIÓN */}
          <div className="rounded-sm border border-stone bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-copper">Gestión de Documentación</h2>
            <p className="text-xs text-ink/60">Aquí podés ver los documentos que subiste, eliminarlos si están desactualizados o adjuntar uno nuevo.</p>

            <div className="space-y-2">
              {archivosStorage.length > 0 ? (
                archivosStorage.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-sm border border-stone bg-stone/5 p-3">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-taller underline truncate max-w-[220px]"
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
                <p className="text-xs text-ink/40 italic">No hay documentos cargados actualmente en el sistema.</p>
              )}
            </div>

            {/* FORMULARIO PARA SUBIR NUEVO DOCUMENTO */}
            <form onSubmit={handleSubirNuevoArchivo} className="mt-4 border-t border-stone pt-4 space-y-3">
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">
                Subir nuevo documento (Actualización)
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
                {subiendoArchivo ? "Subiendo archivo..." : "Subir archivo y enviar a revisión"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}