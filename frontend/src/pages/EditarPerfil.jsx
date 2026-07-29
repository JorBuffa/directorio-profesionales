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
  const [archivosSeleccionados, setArchivosSeleccionados] = useState({});
  const [subiendoTipo, setSubiendoTipo] = useState(null);

  // Cargar y mapear archivos combinando Storage y la URL general guardada en BD
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
          // 1. Buscamos coincidencia exacta por ID de profesional y tipo en el nombre del archivo
          const archivoEncontrado = data?.find(file => 
            file.name.includes(profesional.id) && file.name.toLowerCase().includes(tipo.id)
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
            docsMapeados[tipo.id] = null; 
          }
        });

        // 2. RESPALDO INTELIGENTE: Si hay una URL general en la base de datos (del alta) 
        // y el primer casillero está vacío, la asignamos para que no se pierda de vista.
        if (profesional.documentacion_url && !docsMapeados['dni_frente']) {
          docsMapeados['dni_frente'] = {
            nombreArchivo: "documento_alta",
            url: profesional.documentacion_url
          };
        }

        setDocumentosProfesional(docsMapeados);
      } catch (err) {
        console.error("Error al listar archivos del storage:", err);
        // Si falla el listado del storage pero hay URL en BD, la rescatamos en el primer casillero
        if (profesional?.documentacion_url) {
          setDocumentosProfesional({
            dni_frente: { nombreArchivo: "documento_alta", url: profesional.documentacion_url },
            dni_dorso: null,
            matricula: null,
            adicional: null
          });
        } else {
          setDocumentosProfesional({});
        }
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
      if (docInfo.nombreArchivo && docInfo.nombreArchivo !== "documento_alta") {
        const { error } = await supabase.storage
          .from('documentos')
          .remove([docInfo.nombreArchivo]);

        if (error) throw error;
      }

      // Si eliminamos el único respaldo de BD, limpiamos también la columna
      if (tipoId === 'dni_frente' && docInfo.nombreArchivo === "documento_alta") {
        await supabase.from('profesionales').update({ documentacion_url: null }).eq('id', profesional.id);
      }

      setDocumentosProfesional(prev => ({
        ...prev,
        [tipoId]: null
      }));

      alert("Documento eliminado correctamente.");
    } catch (err) {
      alert("Error al eliminar el archivo: " + err.message);
    }
  }

  // Subir o reemplazar un documento de forma individual por casillero
  async function handleSubirIndividual(tipoId) {
    const archivo = archivosSeleccionados[tipoId];
    if (!archivo) {
      alert("Primero seleccioná un archivo para este casillero.");
      return;
    }

    setSubiendoTipo(tipoId);
    try {
      const documentoAnterior = documentosProfesional[tipoId];
      if (documentoAnterior && documentoAnterior.nombreArchivo && documentoAnterior.nombreArchivo !== "documento_alta") {
        await supabase.storage.from('documentos').remove([documentoAnterior.nombreArchivo]);
      }

      const fileExt = archivo.name.split('.').pop();
      const fileName = `${profesional.id}-${tipoId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, archivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profesionales')
        .update({
          documentacion_url: urlData.publicUrl,
          estado: 'pendiente'
        })
        .eq('id', profesional.id);

      if (updateError) throw updateError;

      setProfesional(prev => ({ ...prev, estado: 'pendiente', documentacion_url: urlData.publicUrl }));
      setArchivosSeleccionados(prev => ({ ...prev, [tipoId]: null }));

      alert("¡Documento subido/reemplazado con éxito!");
      
      // Refrescar lista de archivos
      const { data: listData } = await supabase.storage.from('documentos').list('', { limit: 100 });
      if (listData) {
        const docsMapeados = {};
        TIPOS_DOCUMENTOS_OBLIGATORIOS.forEach(tipo => {
          const archivoEncontrado = listData.find(file => 
            file.name.includes(profesional.id) && file.name.toLowerCase().includes(tipo.id)
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
      setSubiendoTipo(null);
    }
  }

  function handleNotificarAdmin() {
    const nombreProf = profesional.nombre_completo || profesional.nombre || "Profesional";
    const mensajeAdmin = `⚠️ *AVISO DE REVISIÓN DE DOCUMENTACIÓN*:\nEl profesional *${nombreProf}* ha actualizado/subido su documentación y solicita revisión en el panel.`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=${encodeURIComponent(mensajeAdmin)}`, '_blank');
  }

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
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Descripción / Oficios</label>
              <textarea
                rows="3"
                value={profesional.oficios || profesional.descripcion || ""}
                onChange={(e) => setProfesional({ ...profesional, oficios: e.target.value })}
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
              />
            </div>

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
              {cargando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>

          {/* SECCIÓN DE GESTIÓN DE DOCUMENTACIÓN */}
          <div className="rounded-sm border border-stone bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-copper">Gestión de Documentación</h2>
            <p className="text-xs text-ink/60">Cargá de forma independiente los documentos que tengas pendientes. Al finalizar, enviá el aviso al administrador.</p>

            <div className="space-y-4">
              {TIPOS_DOCUMENTOS_OBLIGATORIOS.map((tipo) => {
                const doc = documentosProfesional[tipo.id];
                const archivoSeleccionadoParaEste = archivosSeleccionados[tipo.id];
                const estaSubiendoEste = subiendoTipo === tipo.id;

                return (
                  <div key={tipo.id} className="rounded-sm border border-stone/30 bg-stone/5 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink min-w-[140px] uppercase">
                          {tipo.label}:
                        </span>
                        {doc ? (
                          <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                            ✓ Cargado
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded italic">
                            Casillero vacío (disponible)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {doc && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-sm bg-stone/20 px-3 py-1 text-xs font-medium text-ink hover:bg-stone/30 border border-stone cursor-pointer"
                          >
                            Ver
                          </a>
                        )}

                        {doc && (
                          <button
                            type="button"
                            onClick={() => handleEliminarArchivo(tipo.id)}
                            className="rounded-sm bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 cursor-pointer border border-red-200"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-stone/20">
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setArchivosSeleccionados(prev => ({ ...prev, [tipo.id]: file }));
                        }}
                        className="text-xs text-ink file:mr-2 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-stone/20 file:text-ink hover:file:bg-stone/30 cursor-pointer w-full sm:w-auto"
                      />
                      <button
                        type="button"
                        disabled={!archivoSeleccionadoParaEste || estaSubiendoEste}
                        onClick={() => handleSubirIndividual(tipo.id)}
                        className="rounded-sm bg-taller px-4 py-1.5 text-xs font-medium text-paper hover:opacity-90 cursor-pointer transition disabled:opacity-40 shrink-0"
                      >
                        {estaSubiendoEste ? "Procesando..." : (doc ? "Reemplazar archivo" : "Subir este archivo")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-stone pt-4 text-center">
              <p className="text-xs text-ink/60 mb-3">¿Ya terminaste de actualizar tus documentos? Enviá el aviso definitivo al administrador.</p>
              <button
                type="button"
                onClick={handleNotificarAdmin}
                className="w-full rounded-sm bg-emerald-600 py-2.5 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>📱 Notificar al Administrador por WhatsApp (Revisión Completa)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}