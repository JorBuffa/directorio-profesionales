import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";

// =========================================================================
// CONFIGURACIÓN DE CONTACTO DE WHATSAPP (MODIFICÁ ESTE NÚMERO CUANDO QUIERAS)
// Formato internacional sin espacios, guiones ni símbolos (Ej: código de país + área + número)
// =========================================================================
const NUMERO_WHATSAPP_ADMIN = "5492216110999"; 

export default function AdminLogin() {
  const [autenticado, setAutenticado] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  
  const [tab, setTab] = useState("pendiente");
  const [solicitudes, setSolicitudes] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [archivosStorage, setArchivosStorage] = useState([]);

  const [rubrosOficiales, setRubrosOficiales] = useState([]);
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState({});

  // Función para normalizar texto (Primera letra mayúscula, resto minúscula)
  function capitalizarTexto(texto) {
    if (!texto) return "";
    const minusculas = texto.toLowerCase();
    return minusculas.charAt(0).toUpperCase() + minusculas.slice(1);
  }

  useEffect(() => {
    if (localStorage.getItem("admin_ok") === "true") {
      setAutenticado(true);
    }
  }, []);

  useEffect(() => {
    if (autenticado) {
      cargarSolicitudes();
      cargarRubrosOficiales();
    }
  }, [autenticado, tab]);

  async function cargarRubrosOficiales() {
    try {
      const { data, error } = await supabase
        .from('rubros')
        .select('*')
        .order('nombre', { ascending: true });

      if (!error && data) {
        setRubrosOficiales(data);
      }
    } catch (err) {
      console.error("Error al cargar rubros oficiales:", err);
    }
  }

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

  async function cargarSolicitudes() {
    setCargando(true);
    try {
      const { data, error } = await supabase
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
        .eq('estado', tab);

      if (!error && data) {
        setSolicitudes(data);
        if (data.length > 0) setSeleccionada(data[0]);
        else setSeleccionada(null);
      } else {
        const { data: allData } = await supabase.from('profesionales').select('*');
        if (allData) {
          const filtrados = allData.filter(item => item.estado === tab);
          setSolicitudes(filtrados);
          if (filtrados.length > 0) setSeleccionada(filtrados[0]);
          else setSeleccionada(null);
        }
      }
    } catch (err) {
      console.error("Error al cargar:", err);
    } finally {
      setCargando(false);
    }
  }

  function handleCambioRubroLocal(profesionalId, nuevoRubroId) {
    setRubrosSeleccionados(prev => ({
      ...prev,
      [profesionalId]: nuevoRubroId
    }));
  }

  // Función para guardar específicamente el cambio de rubro de manera independiente
  async function actualizarRubroSeleccionado() {
    if (!seleccionada) return;
    const nuevoRubroId = rubrosSeleccionados[seleccionada.id];
    
    if (!nuevoRubroId) {
      alert("Por favor, selecciona un rubro diferente en el menú desplegable primero.");
      return;
    }

    try {
      await supabase
        .from('profesional_rubros')
        .delete()
        .eq('profesional_id', seleccionada.id);

      const { error: errorRelacion } = await supabase
        .from('profesional_rubros')
        .insert([
          { profesional_id: seleccionada.id, rubro_id: nuevoRubroId }
        ]);

      if (errorRelacion) throw errorRelacion;

      alert("¡Rubro actualizado correctamente!");
      cargarSolicitudes();
    } catch (err) {
      alert("Error al actualizar el rubro: " + err.message);
    }
  }

  async function cambiarEstado(id, nuevoEstado, requiereMotivo = false) {
    let motivo = "";
    if (requiereMotivo) {
      const inputMotivo = window.prompt("Ingrese el motivo de rechazo o suspensión:");
      if (inputMotivo === null) return; 
      motivo = inputMotivo;
    }

    try {
      const updateData = { estado: nuevoEstado };
      if (requiereMotivo && motivo) {
        updateData.motivo_rechazo = motivo;
      }

      let { error } = await supabase
        .from('profesionales')
        .update(updateData)
        .eq('id', id);

      if (error && error.message.includes('motivo_rechazo')) {
        const { error: errorSimple } = await supabase
          .from('profesionales')
          .update({ estado: nuevoEstado })
          .eq('id', id);
        if (errorSimple) throw errorSimple;
      } else if (error) {
        throw error;
      }

      if (nuevoEstado === 'aprobado') {
        const rubroNuevoId = rubrosSeleccionados[id];
        if (rubroNuevoId) {
          await supabase
            .from('profesional_rubros')
            .delete()
            .eq('profesional_id', id);

          const { error: errorRelacion } = await supabase
            .from('profesional_rubros')
            .insert([
              { profesional_id: id, rubro_id: rubroNuevoId }
            ]);

          if (errorRelacion) throw errorRelacion;
        }
      }

      cargarSolicitudes();
      setSeleccionada(null);
    } catch (err) {
      alert("Error al actualizar el estado: " + err.message);
    }
  }

  async function eliminarRegistro(id) {
    const confirmar = window.confirm("¿Estás seguro de querer eliminar este registro permanentemente?");
    if (!confirmar) return;

    try {
      await supabase.from('profesional_rubros').delete().eq('profesional_id', id);
      const { error } = await supabase.from('profesionales').delete().eq('id', id);
      if (error) throw error;

      cargarSolicitudes();
      setSeleccionada(null);
    } catch (err) {
      alert("Error al eliminar el registro: " + err.message);
    }
  }

  function handleLogin(e) {
    if (e) e.preventDefault();
    if (password === "1478") {
      localStorage.setItem("admin_ok", "true");
      setAutenticado(true);
    } else {
      setError(true);
    }
  }

  const docEnTabla = seleccionada?.documentacion_url || seleccionada?.cv || seleccionada?.archivo || seleccionada?.documento || seleccionada?.matricula_url;

  if (!autenticado) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
        <div className="w-full rounded-sm border border-stone bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-ink">Ingreso administrador</h1>
          <p className="mt-1 text-sm text-ink/60">Acceso exclusivo con contraseña numérica.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">
                Contraseña
              </label>
              <input
                type="password"
                maxLength={4}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin();
                }}
                placeholder="••••"
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 font-mono text-lg tracking-widest text-ink focus:border-copper focus:outline-none"
                autoFocus
              />
            </div>

            {error && (
              <p className="rounded-sm bg-copper/10 p-2 text-xs font-medium text-copper-dark">
                Contraseña incorrecta (es 1478).
              </p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              className="w-full rounded-sm bg-taller py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
            >
              Ingresar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between border-b border-stone pb-4">
        <h1 className="font-display text-2xl font-bold text-ink">Panel de moderación</h1>
        <div className="flex items-center gap-4">
          {/* Enlace rápido de contacto usando la constante definida arriba */}
          <a
            href={`https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=Hola,%20contacto%20desde%20el%20panel%20de%20administración.`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-taller font-medium hover:underline flex items-center gap-1"
          >
            💬 WhatsApp Admin
          </a>
          <button
            onClick={() => {
              localStorage.removeItem("admin_ok");
              setAutenticado(false);
              setPassword("");
            }}
            className="text-xs text-copper hover:underline cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-b border-stone">
        {[
          { id: "pendiente", label: "Pendientes" },
          { id: "aprobado", label: "Aprobados" },
          { id: "rechazado", label: "Rechazados" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSeleccionada(null); }}
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
          {solicitudes.map((s) => {
            const nombreRubroCrudo = s.profesional_rubros?.[0]?.rubros?.nombre || s.categoria || s.localidad || "Sin categoría";
            return (
              <button
                key={s.id}
                onClick={() => setSeleccionada(s)}
                className={`w-full rounded-sm border p-4 text-left transition cursor-pointer ${
                  seleccionada?.id === s.id ? "border-copper bg-copper/5" : "border-stone bg-white"
                }`}
              >
                <p className="font-display font-semibold text-ink">{s.nombre_completo || s.nombre}</p>
                <p className="text-xs uppercase tracking-wide text-taller">
                  {capitalizarTexto(nombreRubroCrudo)}
                </p>
                <p className="mt-1 font-mono text-xs text-ink/40">{s.email}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-sm border border-stone bg-white p-6">
          {!seleccionada && <p className="text-sm text-ink/50">Elegí una ficha para ver los detalles, la documentación y gestionar su estado.</p>}

          {seleccionada && (
            <div>
              <h2 className="font-display text-xl font-bold text-ink">{seleccionada.nombre_completo || seleccionada.nombre}</h2>
              <p className="text-sm text-ink/60">{seleccionada.email} · {seleccionada.whatsapp || seleccionada.telefono || "Sin teléfono"}</p>
              <p className="mt-1 text-xs font-mono text-ink/50">Localidad: {seleccionada.localidad || seleccionada.direccion || "No especificada"}</p>

              <div className="mt-4 bg-stone/5 p-3 rounded border border-stone/30">
                <label className="block text-xs font-semibold text-ink/70 mb-1">
                  Rubro actual / Reasignar rubro oficial:
                </label>
                <select
                  defaultValue={seleccionada.profesional_rubros?.[0]?.rubros?.id || ""}
                  onChange={(e) => handleCambioRubroLocal(seleccionada.id, e.target.value)}
                  className="w-full rounded-sm border border-stone bg-white px-3 py-1.5 text-xs text-ink focus:border-copper focus:outline-none"
                >
                  <option value="" disabled>Seleccioná un rubro oficial</option>
                  {rubrosOficiales.map((r) => (
                    <option key={r.id} value={r.id}>
                      {capitalizarTexto(r.nombre)} {r.id === seleccionada.profesional_rubros?.[0]?.rubros?.id ? "(Actual)" : ""}
                    </option>
                  ))}
                </select>

                {/* Botón independiente para actualizar el rubro de inmediato */}
                <button
                  type="button"
                  onClick={actualizarRubroSeleccionado}
                  className="mt-2 rounded-sm bg-copper px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Guardar nuevo rubro
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 bg-stone/10 p-3 rounded-sm border border-stone/40">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/60">Acciones:</span>
                
                {tab === "pendiente" && (
                  <>
                    <button
                      onClick={() => cambiarEstado(seleccionada.id, 'aprobado')}
                      className="rounded-sm bg-taller px-4 py-2 text-xs font-medium text-paper hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      Aprobar y Asignar Rubro
                    </button>
                    <button
                      onClick={() => cambiarEstado(seleccionada.id, 'rechazado', true)}
                      className="rounded-sm border border-copper px-4 py-2 text-xs font-medium text-copper-dark hover:bg-copper hover:text-paper cursor-pointer shadow-xs"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {tab === "aprobado" && (
                  <button
                    onClick={() => cambiarEstado(seleccionada.id, 'rechazado', true)}
                    className="rounded-sm bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 cursor-pointer shadow-xs"
                  >
                    Suspender / Dar de baja
                  </button>
                )}

                {tab === "rechazado" && (
                  <>
                    <button
                      onClick={() => cambiarEstado(seleccionada.id, 'aprobado')}
                      className="rounded-sm bg-taller px-4 py-2 text-xs font-medium text-paper hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      Reactivar / Aprobar
                    </button>
                    <button
                      onClick={() => eliminarRegistro(seleccionada.id)}
                      className="rounded-sm bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 cursor-pointer shadow-xs"
                    >
                      Eliminar permanentemente
                    </button>
                  </>
                )}
              </div>

              <p className="mt-5 text-sm text-ink/80">{seleccionada.descripcion || "Sin descripción proporcionada."}</p>

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
                      📄 Ver Documento Principal
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
                      📁 {file.name}
                    </a>
                  ))}

                  {!docEnTabla && archivosStorage.length === 0 && (
                    <p className="text-xs text-ink/40 italic">No hay archivos vinculados en el storage para este usuario.</p>
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