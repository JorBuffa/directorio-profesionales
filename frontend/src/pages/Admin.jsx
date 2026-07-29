import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient.js";

const TABS = [
  { id: "pendiente", label: "Pendientes" },
  { id: "aprobado", label: "Aprobados" },
  { id: "rechazado", label: "Rechazados" }
];

export default function Admin() {
  const [tab, setTab] = useState("pendiente");
  const [solicitudes, setSolicitudes] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [archivosStorage, setArchivosStorage] = useState([]);

  async function cargar() {
    setCargando(true);
    try {
      // Primero intentamos la consulta trayendo todos los registros del estado actual
      const { data, error } = await supabase
        .from('profesionales')
        .select(`
          *,
          profesional_rubros (
            rubros (
              nombre
            )
          )
        `)
        .eq('estado', tab);

      if (error) {
        console.warn("Error en consulta con relaciones, intentando fallback simple...", error);
        const { data: dataFallback, error: errFallback } = await supabase
          .from('profesionales')
          .select('*')
          .eq('estado', tab);
        
        if (!errFallback && dataFallback) {
          setSolicitudes(dataFallback);
          setSeleccionada(dataFallback.length > 0 ? dataFallback[0] : null);
        } else {
          setSolicitudes([]);
          setSeleccionada(null);
        }
      } else {
        // Aseguramos filtrar también en el cliente por si acaso la base devuelve algo extra
        const filtrados = (data || []).filter(item => item.estado === tab);
        setSolicitudes(filtrados);
        setSeleccionada(filtrados.length > 0 ? filtrados[0] : null);
      }
    } catch (err) {
      console.error("Error al cargar profesionales:", err);
      setSolicitudes([]);
      setSeleccionada(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [tab]);

  // Búsqueda ampliada en el Storage de Supabase
  useEffect(() => {
    async function obtenerArchivos() {
      if (!seleccionada) {
        setArchivosStorage([]);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('documentos')
          .list('', { limit: 100 });

        if (!error && data) {
          const matches = data.filter(file => 
            file.name.includes(seleccionada.id) || 
            (seleccionada.email && file.name.toLowerCase().includes(seleccionada.email.toLowerCase().split('@')[0]))
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

    obtenerArchivos();
  }, [seleccionada]);

  async function cambiarEstado(profesional, nuevoEstado, requiereMotivo = false) {
    let motivo = "";
    if (requiereMotivo) {
      motivo = window.prompt("Ingrese el motivo:") || "No especificado";
      if (motivo === null) return; // Si cancela el prompt, no hace nada
    }

    try {
      const updateData = { estado: nuevoEstado };
      if (requiereMotivo) {
        updateData.motivo_rechazo = motivo;
      }

      const { error } = await supabase
        .from('profesionales')
        .update(updateData)
        .eq('id', profesional.id);

      if (error) throw error;

      // Si se rechazó o suspendió y tiene teléfono/whatsapp, disparamos el mensaje automático
      if ((nuevoEstado === 'rechazado') && (profesional.whatsapp || profesional.telefono)) {
        const tel = profesional.whatsapp || profesional.telefono;
        const nombreProf = profesional.nombre_completo || profesional.nombre || "Profesional";
        const mensaje = `Hola *${nombreProf}*, nos comunicamos desde *ConectaOficios*. Te informamos que tu perfil ha sido suspendido / rechazado por el siguiente motivo: _${motivo}_. Por favor, revisa los datos o la documentación solicitada para poder reactivarlo. ¡Muchas gracias!`;
        
        const urlWhatsApp = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
        window.open(urlWhatsApp, '_blank');
      }

      cargar();
    } catch (err) {
      alert("Error al actualizar el estado: " + err.message);
    }
  }

  // Detectar cualquier URL o ruta de documento que venga en la tabla de la base de datos
  const docEnTabla = seleccionada?.documentacion_url || seleccionada?.cv || seleccionada?.archivo || seleccionada?.documento || seleccionada?.matricula_url;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">Panel de moderación</h1>

      <div className="mt-4 flex gap-2 border-b border-stone">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium cursor-pointer ${
              tab === t.id ? "border-b-2 border-copper text-copper" : "text-ink/50 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {cargando && <p className="text-sm text-ink/50">Cargando…</p>}
          {!cargando && solicitudes.length === 0 && (
            <p className="text-sm text-ink/50">No hay registros en este estado.</p>
          )}
          {solicitudes.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeleccionada(s)}
              className={`w-full rounded-sm border p-4 text-left transition cursor-pointer ${
                seleccionada?.id === s.id ? "border-copper bg-copper/5" : "border-stone bg-white"
              }`}
            >
              <p className="font-display font-semibold text-ink">{s.nombre_completo || s.nombre}</p>
              <p className="text-xs uppercase tracking-wide text-taller">
                {s.profesional_rubros?.[0]?.rubros?.nombre || s.categoria || "Sin categoría"}
              </p>
              <p className="mt-1 font-mono text-xs text-ink/40">{s.email}</p>
            </button>
          ))}
        </div>

        <div className="rounded-sm border border-stone bg-white p-6">
          {!seleccionada && <p className="text-sm text-ink/50">Elegí una ficha para ver los detalles, la documentación y gestionar su estado.</p>}

          {seleccionada && (
            <div>
              <h2 className="font-display text-xl font-bold text-ink">{seleccionada.nombre_completo || seleccionada.nombre}</h2>
              <p className="text-sm text-ink/60">{seleccionada.email} · {seleccionada.whatsapp || seleccionada.telefono || "Sin teléfono"}</p>
              <p className="mt-1 text-xs font-mono text-ink/50">Localidad: {seleccionada.localidad || seleccionada.direccion || "No especificada"}</p>

              {/* BARRA DE BOTONES DE ACCIÓN */}
              <div className="mt-5 flex flex-wrap items-center gap-3 bg-stone/10 p-3 rounded-sm border border-stone/40">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/60">Acciones:</span>
                
                {tab === "pendiente" && (
                  <>
                    <button
                      onClick={() => cambiarEstado(seleccionada, 'aprobado')}
                      className="rounded-sm bg-taller px-4 py-2 text-xs font-medium text-paper hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => cambiarEstado(seleccionada, 'rechazado', true)}
                      className="rounded-sm border border-copper px-4 py-2 text-xs font-medium text-copper-dark hover:bg-copper hover:text-paper cursor-pointer shadow-xs"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {tab === "aprobado" && (
                  <button
                    onClick={() => cambiarEstado(seleccionada, 'rechazado', true)}
                    className="rounded-sm bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 cursor-pointer shadow-xs"
                  >
                    Suspender / Dar de baja
                  </button>
                )}

                {tab === "rechazado" && (
                  <button
                    onClick={() => cambiarEstado(seleccionada, 'aprobado')}
                    className="rounded-sm bg-taller px-4 py-2 text-xs font-medium text-paper hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    Reactivar / Aprobar
                  </button>
                )}
              </div>

              <p className="mt-5 text-sm text-ink/80">{seleccionada.descripcion || "Sin descripción proporcionada."}</p>

              {/* SECCIÓN DE DOCUMENTACIÓN GARANTIZADA */}
              <div className="mt-6 border-t border-stone pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-copper mb-3">Documentación Adjunta</h3>
                
                <div className="flex flex-wrap gap-2">
                  {docEnTabla && (
                    <a
                      href={docEnTabla}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm bg-stone/20 px-3 py-2 text-xs font-medium text-ink hover:bg-stone/30 border border-stone flex items-center gap-1 cursor-pointer"
                    >
                      📄 Ver Documento (Base de datos)
                    </a>
                  )}

                  {archivosStorage.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm bg-stone/20 px-3 py-2 text-xs font-medium text-ink hover:bg-stone/30 border border-stone flex items-center gap-1 cursor-pointer"
                    >
                      📁 {file.nombre}
                    </a>
                  ))}

                  {!docEnTabla && archivosStorage.length === 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-ink/50 italic">No se detectaron enlaces automáticos. Podés revisar directamente en el bucket de Supabase.</p>
                      <a
                        href={`https://supabase.com/dashboard`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-copper underline font-medium"
                      >
                        Ir al panel de Supabase Storage
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {seleccionada.motivo_rechazo && (
                <p className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-700">
                  Motivo de rechazo/baja: {seleccionada.motivo_rechazo}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}