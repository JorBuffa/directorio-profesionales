import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";

// =========================================================================
// CONFIGURACIÓN DE CONTACTO DE WHATSAPP DEL ADMIN
// =========================================================================
const NUMERO_WHATSAPP_ADMIN = "5492216110999";

export default function EditarPerfil() {
  const [identificador, setIdentificador] = useState("");
  const [profesional, setProfesional] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  
  // Definición de etiquetas fijas para los documentos requeridos
  const TIPOS_DOCUMENTOS_OBLIGATORIOS = [
    { id: "dni_frente", label: "DNI (Frente)" },
    { id: "dni_dorso", label: "DNI (Dorso)" },
    { id: "matricula", label: "Matrícula / Certificado" },
    { id: "adicional", label: "Documento Adicional / CV" }
  ];

  const [documentosProfesional, setDocumentosProfesional] = useState({});
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [tipoDocumentoSubida, setTipoDocumentoSubida] = useState("dni_frente");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  // Cargar y mapear archivos del Storage cuando se selecciona un profesional
  useEffect(() => {
    async function obtenerArchivosDelStorage() {
      if (!profesional) {
        setDocumentosProfesional({});
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('documentos')
          .list('', { limit: 100 });

        if (error) throw error;

        const docsMapeados = {};

        TIPOS_DOCUMENTOS_OBLIGATORIOS.forEach(tipo => {
          // Buscamos si hay un archivo que pertenezca al profesional y coincida con el tipo
          const archivoEncontrado = data?.find(file => 
            file.name.includes(profesional.id) && file.name.includes(tipo.id)
          );

          if (archivoEncontrado) {
            const { data: urlData } = supabase.storage
              .from('documentos')
              .getPublicUrl(archivoEncontrado.name);

            docsMapeados[tipo.id] = {
              nombreArchivo: archivoEncontrado.name,
              url: urlData.publicUrl
            };
          } else {
            docsMapeados[tipo.id] = null; // Casillero vacío disponible
          }
        });

        // Soporte para campo legado general si existiera
        if (profesional.documentacion_url && !docsMapeados['dni_frente']) {
          docsMapeados['dni_frente'] = {
            nombreArchivo: "documento_principal",
            url: profesional.documentacion_url
          };
        }

        setDocumentosProfesional(docsMapeados);
      } catch (err) {
        console.error("Error al listar archivos del storage:", err);
        setDocumentosProfesional({});
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

  // Borrar un archivo específico manteniendo el casillero vacío disponible
  async function handleEliminarArchivo(tipoId) {
    const docInfo = documentosProfesional[tipoId];
    if (!docInfo) return;

    if (!window.confirm("¿Estás seguro de querer eliminar este documento? El espacio quedará disponible para volver a cargarlo.")) return;

    try {
      if (docInfo.nombreArchivo && docInfo.nombreArchivo !== "documento_principal") {
        const { error } = await supabase.storage
          .from('documentos')
          .remove([docInfo.nombreArchivo]);

        if (error) throw error;
      }

      // Actualizamos estado local dejando el casillero vacío
      setDocumentosProfesional(prev => ({
        ...prev,
        [tipoId]: null
      }));

      alert("Documento eliminado correctamente. El casillero ya se encuentra disponible.");
    } catch (err) {
      alert("Error al eliminar el archivo: " + err.message);
    }
  }

  // Subir un nuevo archivo, cambiar estado a pendiente y notificar por WhatsApp al Admin
  async function handleSubirNuevoArchivo(e) {
    e.preventDefault();
    if (!nuevoArchivo) return;

    setSubiendoArchivo(true);
    try {
      const fileExt = nuevoArchivo.name.split('.').pop();
      const fileName = `${profesional.id}-${tipoDocumentoSubida}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, nuevoArchivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      // Actualizamos la base de datos (estado a pendiente para revisión)
      const { error: updateError } = await supabase
        .from('profesionales')
        .update({
          documentacion_url: urlData.publicUrl,
          estado: 'pendiente'
        })
        .eq('id', profesional.id);

      if (updateError) throw updateError;

      // Notificar automáticamente al WhatsApp del Administrador
      const nombreProf = profesional.nombre_completo || profesional.nombre || "Profesional";
      const mensajeAdmin = `⚠️ *AVISO DE NUEVA REVISIÓN*:\nEl profesional *${nombreProf}* ha actualizado/subido un documento (${tipoDocumentoSubida}) y solicita revisión y aprobación en el panel.`;
      
      window.open(`https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=${encodeURIComponent(mensajeAdmin)}`, '_blank');

      alert("¡Documento subido con éxito! Tu perfil ha sido enviado nuevamente a revisión.");
      
      // Actualizamos el estado local
      setProfesional(prev => ({ ...prev, estado: 'pendiente', documentacion_url: urlData.publicUrl }));
      setNuevoArchivo(null);

      // Refrescamos los archivos listados en las etiquetas fijas
      const { data: listData } = await supabase.storage.from('documentos').list('', { limit: 100 });
      if (listData) {
        const docsMapeados = {};
        TIPOS_DOCUMENTOS_OBLIGATORIOS.forEach(tipo => {
          const archivoEncontrado = listData.find(file => 
            file.name.includes(profesional.id) && file.name.includes(tipo.id)
          );
          if (archivoEncontrado) {
            const { data: uData } = supabase.storage.from('documentos').getPublicUrl(archivoEncontrado.name);
            docsMapeados[tipo.id] = { nombreArchivo: archivoEncontrado.name, url: uData.publicUrl };
          } else {
            docsMapeados[tipo.id] = null;
          }
        });
        setDocumentosProfesional(docsMapeados);
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

          {/* SECCIÓN DE GESTIÓN DE DOCUMENTACIÓN CON ETIQUETAS FIJAS */}
          <div className="rounded-sm border border-stone bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-copper">Gestión de Documentación</h2>
            <p className="text-xs text-ink/60">Visualizá tus documentos actuales, eliminalos si están desactualizados o subí un archivo nuevo para reactivar tu cuenta.</p>

            <div className="space-y-3">
              {TIPOS_DOCUMENTOS_OBLIGATORIOS.map((tipo) => {
                const doc = documentosProfesional[tipo.id];
                return (
                  <div key={tipo.id} className="flex items-center justify-between rounded-sm border border-stone/30 bg-stone/5 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs font-bold text-ink min-w-[140px] uppercase">
                        {tipo.label}:
                      </span>
                      {doc ? (
                        <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded truncate max-w-[150px]">
                          ✓ Cargado
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded italic">
                          Casillero vacío (disponible)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-sm bg-stone/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/30 border border-stone cursor-pointer"
                        >
                          Ver
                        </a>
                      )}

                      {doc ? (
                        <button
                          type="button"
                          onClick={() => handleEliminarArchivo(tipo.id)}
                          className="rounded-sm bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 cursor-pointer border border-red-200"
                        >
                          Eliminar
                        </button>
                      ) : (
                        <span className="text-xs text-stone-400 italic px-2">Sin archivo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FORMULARIO PARA SUBIR NUEVO DOCUMENTO CON SELECCIÓN DE TIPO */}
            <form onSubmit={handleSubirNuevoArchivo} className="mt-4 border-t border-stone pt-4 space-y-3">
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">
                Subir nuevo documento (Actualización)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={tipoDocumentoSubida}
                  onChange={(e) => setTipoDocumentoSubida(e.target.value)}
                  className="rounded-sm border border-stone p-2 text-xs bg-white text-ink focus:border-copper focus:outline-none"
                >
                  {TIPOS_DOCUMENTOS_OBLIGATORIOS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>

                <input
                  type="file"
                  onChange={(e) => setNuevoArchivo(e.target.files[0])}
                  className="w-full text-xs text-ink/70 file:mr-2 file:py-2 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={!nuevoArchivo || subiendoArchivo}
                className="w-full rounded-sm bg-taller py-2.5 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {subiendoArchivo ? "Subiendo archivo y notificando..." : "Subir archivo y enviar a revisión"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}