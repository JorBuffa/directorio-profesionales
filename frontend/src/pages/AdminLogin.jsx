import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";

// =========================================================================
// CONFIGURACIÓN DE CONTACTO DE WHATSAPP (MODIFICÁ ESTE NÚMERO CUANDO QUIERAS)
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
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState([]);

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

  // Cada vez que seleccionamos un profesional, cargamos sus rubros actuales en el estado de checkboxes
  useEffect(() => {
    if (seleccionada && seleccionada.profesional_rubros) {
      const idsActuales = seleccionada.profesional_rubros.map(item => item.rubros?.id).filter(Boolean);
      setRubrosSeleccionados(idsActuales);
    } else {
      setRubrosSeleccionados([]);
    }
  }, [seleccionada]);

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
        // Listamos recursivamente o dentro de la carpeta cuyo nombre contenga el ID del profesional
        const carpetaId = seleccionada.id;
        const { data, error } = await supabase.storage
          .from('documentos')
          .list(carpetaId, { limit: 100 });

        let matches = [];
        if (!error && data && data.length > 0) {
          // Archivos dentro de la carpeta con el ID del profesional
          matches = data.map(file => ({
            name: `${carpetaId}/${file.name}`,
            nombreOriginal: file.name
          }));
        } else {
          // Búsqueda general por si están guardados a nivel raíz con el ID en el nombre
          const { data: rootData, error: rootError } = await supabase.storage
            .from('documentos')
            .list('', { limit: 100 });

          if (!rootError && rootData) {
            const filtrados = rootData.filter(file => 
              file.name.includes(seleccionada.id) || 
              (seleccionada.email && file.name.toLowerCase().includes(seleccionada.email.toLowerCase().split('@')[0]))
            );
            matches = filtrados.map(file => ({
              name: file.name,
              nombreOriginal: file.name.split('/').pop()
            }));
          }
        }

        const archivosConUrl = matches.map((file) => {
          const rutaLimpia = file.name.startsWith('/') ? file.name.substring(1) : file.name;
          
          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(rutaLimpia);
          
          const extension = file.nombreOriginal.split('.').pop().toLowerCase();
          let tipoIcono = "📁";
          if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
            tipoIcono = "🖼️";
          } else if (['pdf'].includes(extension)) {
            tipoIcono = "📄";
          } else if (['doc', 'docx', 'txt'].includes(extension)) {
            tipoIcono = "📝";
          }

          return {
            nombre: file.nombreOriginal,
            rutaCompleta: rutaLimpia,
            url: urlData.publicUrl,
            extension,
            tipoIcono
          };
        });

        setArchivosStorage(archivosConUrl);
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
        if (data.length > 0) {
          setSeleccionada(data[0]);
        } else {
          setSeleccionada(null);
        }
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

  function handleCheckboxRubro(rubroId) {
    if (rubrosSeleccionados.includes(rubroId)) {
      setRubrosSeleccionados(rubrosSeleccionados.filter(id => id !== rubroId));
    } else {
      setRubrosSeleccionados([...rubrosSeleccionados, rubroId]);
    }
  }

  async function guardarRubrosSeleccionados() {
    if (!seleccionada) return;

    try {
      await supabase
        .from('profesional_rubros')
        .delete()
        .eq('profesional_id', seleccionada.id);

      if (rubrosSeleccionados.length > 0) {
        const nuevasRelaciones = rubrosSeleccionados.map(rId => ({
          profesional_id: seleccionada.id,
          rubro_id: rId
        }));
        const { error: errorRelacion } = await supabase
          .from('profesional_rubros')
          .insert(nuevasRelaciones);

        if (errorRelacion) throw errorRelacion;
      }

      alert("¡Rubros actualizados correctamente!");
      cargarSolicitudes();
    } catch (err) {
      alert("Error al actualizar los rubros: " + err.message);
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
      } else if (nuevoEstado === 'aprobado') {
        updateData.motivo_rechazo = null;
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
        await supabase
          .from('profesional_rubros')
          .delete()
          .eq('profesional_id', id);

        if (rubrosSeleccionados.length > 0) {
          const nuevasRelaciones = rubrosSeleccionados.map(rId => ({
            profesional_id: id,
            rubro_id: rId
          }));
          await supabase.from('profesional_rubros').insert(nuevasRelaciones);
        }
      }

      if (seleccionada) {
        const tel = seleccionada.whatsapp || seleccionada.telefono;
        const nombreProf = seleccionada.nombre_completo || seleccionada.nombre || "Profesional";
        
        if (tel) {
          let mensaje = "";
          if (nuevoEstado === 'rechazado') {
            mensaje = `Hola *${nombreProf}*, nos comunicamos desde *ConectaOficios*. Te informamos que tu perfil ha sido rechazado / suspendido por el siguiente motivo: _${motivo || "No especificado"}_. Por favor, revisa los datos o la documentación solicitada. ¡Muchas gracias!`;
          } else if (nuevoEstado === 'aprobado') {
            mensaje = `Hola *${nombreProf}*, ¡excelente noticia! Nos comunicamos desde *ConectaOficios* para informarte que tu perfil ha sido aprobado / reactivado con éxito. Ya formás parte de nuestra plataforma. ¡Muchas gracias!`;
          }

          if (mensaje) {
            const urlWhatsApp = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
            window.open(urlWhatsApp, '_blank');
          }
        }
      }

      cargarSolicitudes();
      setSeleccionada(null);
    } catch (err) {
      alert("Error al actualizar el estado: " + err.message);
    }
  }

  async function eliminarRegistro(id) {
    const confirmar = window.confirm("¿Estás seguro de querer eliminar este registro y su documentación permanentemente?");
    if (!confirmar) return;

    try {
      const { data: listaArchivos, error: errorListar } = await supabase.storage
        .from('documentos')
        .list(id, { limit: 100 });

      if (!errorListar && listaArchivos && listaArchivos.length > 0) {
        const rutasABorrar = listaArchivos.map(file => `${id}/${file.name}`);
        await supabase.storage.from('documentos').remove(rutasABorrar);
      }

      await supabase.from('profesional_rubros').delete().eq('profesional_id', id);
      const { error } = await supabase.from('profesionales').delete().eq('id', id);
      if (error) throw error;

      alert("Registro y archivos eliminados correctamente.");
      cargarSolicitudes();
      setSeleccionada(null);
    } catch (err) {
      alert("Error al eliminar el registro: " + err.message);
    }
  }

  async function handleCambiarPasswordDirecto(userId, emailProfesional) {
    if (!userId) {
      alert("No se encontró el ID del usuario.");
      return;
    }

    const nuevaPassword = window.prompt(`Escribe la nueva contraseña para ${emailProfesional || 'el usuario'} (mínimo 6 caracteres):`);
    if (nuevaPassword === null) return;

    if (nuevaPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setCargando(true);
      const { error } = await supabase.rpc('actualizar_password_usuario', {
        user_id: userId,
        nueva_pass: nuevaPassword
      });

      if (error) {
        console.warn(error);
        alert("Asegúrate de tener creada la función RPC en Supabase o usa el cambio manual. (Detalle: " + error.message + ")");
      } else {
        alert(`¡Contraseña actualizada con éxito para ${emailProfesional}!`);
      }
    } catch (err) {
      alert("Ocurrió un error al actualizar la contraseña: " + err.message);
    } finally {
      setCargando(false);
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
            const rubrosNombres = s.profesional_rubros?.map(item => capitalizarTexto(item.rubros?.nombre)).filter(Boolean).join(", ") || s.categoria || s.localidad || "Sin categoría";
            return (
              <button
                key={s.id}
                onClick={() => setSeleccionada(s)}
                className={`w-full rounded-sm border p-4 text-left transition cursor-pointer ${
                  seleccionada?.id === s.id ? "border-copper bg-copper/5" : "border-stone bg-white"
                }`}
              >
                <p className="font-display font-semibold text-ink">{s.nombre_completo || s.nombre}</p>
                <p className="text-xs uppercase tracking-wide text-taller truncate">
                  {rubrosNombres}
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

              {/* SECCIÓN DE RUBROS MÚLTIPLES CON CHECKBOXES */}
              <div className="mt-4 bg-stone/5 p-3 rounded border border-stone/30">
                <label className="block text-xs font-semibold text-ink/70 mb-2">
                  Rubros u Oficios seleccionados (podés modificar o tildar varios):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-white rounded border border-stone/20">
                  {rubrosOficiales.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-ink cursor-pointer p-1 hover:bg-stone/10 rounded">
                      <input
                        type="checkbox"
                        value={r.id}
                        checked={rubrosSeleccionados.includes(r.id)}
                        onChange={() => handleCheckboxRubro(r.id)}
                        className="rounded border-stone text-copper focus:ring-copper"
                      />
                      {capitalizarTexto(r.nombre)}
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={guardarRubrosSeleccionados}
                  className="mt-3 rounded-sm bg-copper px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Guardar selección de rubros
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
                      Aprobación Completa
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

                <button
                  type="button"
                  onClick={() => handleCambiarPasswordDirecto(seleccionada.user_id || seleccionada.id, seleccionada.email)}
                  className="rounded-sm bg-stone/20 px-3 py-2 text-xs font-medium text-ink hover:bg-stone/30 border border-stone cursor-pointer shadow-xs flex items-center gap-1"
                >
                  🔑 Asignar Nueva Clave
                </button>
              </div>

              <p className="mt-5 text-sm text-ink/80">{seleccionada.descripcion || "Sin descripción proporcionada."}</p>

              <div className="mt-6 border-t border-stone pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-copper mb-3">Documentación Adjunta (Archivos individuales)</h3>
                
                <div className="flex flex-wrap gap-2">
                  {docEnTabla && (
                    <a
                      href={docEnTabla}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm bg-stone/20 px-3 py-2 text-xs font-medium text-ink hover:bg-stone/30 border border-stone flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📄</span>
                      <span>Ver Documento Principal</span>
                    </a>
                  )}

                  {archivosStorage.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm bg-stone/20 px-3 py-2 text-xs font-medium text-ink hover:bg-stone/30 border border-stone flex items-center gap-1.5 cursor-pointer"
                      title={`Abrir archivo: ${file.nombre}`}
                    >
                      <span>{file.tipoIcono}</span>
                      <span className="font-medium max-w-[160px] truncate">{file.nombre}</span>
                      <span className="text-[10px] text-ink/50 uppercase font-mono bg-stone/30 px-1 py-0.5 rounded">
                        {file.extension}
                      </span>
                    </a>
                  ))}

                  {!docEnTabla && archivosStorage.length === 0 && (
                    <p className="text-xs text-ink/40 italic">No hay archivos ni carpetas en el Storage vinculados a este usuario.</p>
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