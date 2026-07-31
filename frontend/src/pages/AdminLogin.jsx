import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";
import AdminDiccionario from "../components/AdminDiccionario"; // <--- IMPORTAMOS EL COMPONENTE

// =========================================================================
// CONFIGURACIÓN DE CONTACTO DE WHATSAPP
// =========================================================================
const NUMERO_WHATSAPP_ADMIN = "5492216110999"; 

export default function AdminLogin() {
  const [autenticado, setAutenticado] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  
  // Agregamos "diccionario" como una opción posible en el sistema de pestañas (tab)
  const [tab, setTab] = useState("pendiente");
  const [solicitudes, setSolicitudes] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [archivosStorage, setArchivosStorage] = useState([]);
  const [debugInfo, setDebugInfo] = useState({ estado: "Esperando selección", detalle: "" });

  const [rubrosOficiales, setRubrosOficiales] = useState([]);
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState([]);

  function capitalizarTexto(texto) {
    if (!texto) return "";
    const minusculas = texto.toLowerCase();
    return minusculas.charAt(0).toUpperCase() + minusculas.slice(1);
  }

  function limpiarNumeroWhatsApp(tel) {
    if (!tel) return "";
    return tel.replace(/\D/g, '');
  }

  useEffect(() => {
    if (localStorage.getItem("admin_ok") === "true") {
      setAutenticado(true);
    }
  }, []);

  useEffect(() => {
    if (autenticado && tab !== "diccionario") {
      cargarSolicitudes();
      cargarRubrosOficiales();
    }
  }, [autenticado, tab]);

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

  // BÚSQUEDA ROBUSTA DE ARCHIVOS EN STORAGE CON PROTECCIÓN DE CONCURRENCIA
  useEffect(() => {
    let isMounted = true;

    async function obtenerArchivos() {
      if (!seleccionada) {
        if (isMounted) {
          setArchivosStorage([]);
          setDebugInfo({ estado: "Sin selección", detalle: "Selecciona una ficha para inspeccionar archivos." });
        }
        return;
      }

      const idActual = seleccionada.id;
      const emailActual = seleccionada.email || "";
      
      if (isMounted) {
        setDebugInfo({ estado: "Buscando...", detalle: `Consultando archivos para ID: ${idActual}` });
      }

      try {
        let matches = [];
        let metodoUsado = "";

        const { data: dataCarpeta, error: errorCarpeta } = await supabase.storage
          .from('documentos')
          .list(String(idActual), { limit: 100 });

        if (!errorCarpeta && dataCarpeta && dataCarpeta.length > 0) {
          metodoUsado = "Carpeta exacta por ID";
          matches = dataCarpeta.map(file => ({
            name: `${idActual}/${file.name}`,
            nombreOriginal: file.name
          }));
        } else {
          const { data: rootData, error: rootError } = await supabase.storage
            .from('documentos')
            .list('', { limit: 500 });

          if (rootError) {
            throw new Error(`Error al listar raíz del bucket: ${rootError.message}`);
          }

          if (rootData && rootData.length > 0) {
            const emailPrefijo = emailActual.toLowerCase().split('@')[0];
            
            const filtrados = rootData.filter(item => {
              const nombreLower = item.name.toLowerCase();
              return (
                nombreLower.includes(String(idActual).toLowerCase()) ||
                (emailPrefijo && nombreLower.includes(emailPrefijo))
              );
            });

            if (filtrados.length > 0) {
              metodoUsado = "Búsqueda global por coincidencia de ID/Email";
              for (const item of filtrados) {
                if (!isMounted) break;
                if (!item.id || item.name.endsWith('/')) {
                  const subCarpetaRuta = item.name.endsWith('/') ? item.name.slice(0, -1) : item.name;
                  const { data: subData } = await supabase.storage
                    .from('documentos')
                    .list(subCarpetaRuta, { limit: 100 });
                  
                  if (subData && subData.length > 0) {
                    subData.forEach(subFile => {
                      matches.push({
                        name: `${subCarpetaRuta}/${subFile.name}`,
                        nombreOriginal: subFile.name
                      });
                    });
                  }
                } else {
                  matches.push({
                    name: item.name,
                    nombreOriginal: item.name.split('/').pop()
                  });
                }
              }
            }
          }
        }

        const archivosConUrl = matches.map((file) => {
          const rutaLimpia = file.name.startsWith('/') ? file.name.substring(1) : file.name;
          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(rutaLimpia);
          
          const extension = file.nombreOriginal.split('.').pop().toLowerCase();
          let tipoIcono = "📁";
          if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) tipoIcono = "🖼️";
          else if (['pdf'].includes(extension)) tipoIcono = "📄";
          else if (['doc', 'docx', 'txt'].includes(extension)) tipoIcono = "📝";

          return {
            nombre: file.nombreOriginal,
            rutaCompleta: rutaLimpia,
            url: urlData.publicUrl,
            extension,
            tipoIcono
          };
        });

        if (isMounted) {
          setArchivosStorage(archivosConUrl);
          setDebugInfo({
            estado: "Completado con éxito",
            detalle: `Método: [${metodoUsado || "Ninguna coincidencia"}]. Archivos hallados: ${archivosConUrl.length}`
          });
        }

      } catch (err) {
        console.error("Error crítico en obtenerArchivos:", err);
        if (isMounted) {
          setArchivosStorage([]);
          setDebugInfo({ estado: "Error de Storage", detalle: err.message });
        }
      }
    }

    obtenerArchivos();

    return () => {
      isMounted = false;
    };
  }, [seleccionada]);

  async function cargarSolicitudes() {
    setCargando(true);
    try {
      let { data, error } = await supabase
        .from('profesionales')
        .select('*')
        .ilike('estado', tab);

      if (error) throw error;

      if (data && data.length > 0) {
        const idsProfesionales = data.map(p => p.id);
        
        const { data: relRubros } = await supabase
          .from('profesional_rubros')
          .select(`
            profesional_id,
            rubros (
              id,
              nombre
            )
          `)
          .in('profesional_id', idsProfesionales);

        const dataConRubros = data.map(prof => {
          const rubrosDelProf = relRubros 
            ? relRubros.filter(r => r.profesional_id === prof.id)
            : [];
          return {
            ...prof,
            profesional_rubros: rubrosDelProf
          };
        });

        setSolicitudes(dataConRubros);
        setSeleccionada(prev => {
          if (!prev) return dataConRubros[0];
          const encontrada = dataConRubros.find(item => item.id === prev.id);
          return encontrada || dataConRubros[0];
        });
      } else {
        setSolicitudes([]);
        setSeleccionada(null);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes:", err);
      setSolicitudes([]);
      setSeleccionada(null);
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
      if (requiereMotivo) {
        updateData.motivo_rechazo = motivo || "No especificado";
      } else if (nuevoEstado === 'aprobado') {
        updateData.motivo_rechazo = null;
      }

      let { error } = await supabase
        .from('profesionales')
        .update(updateData)
        .eq('id', id);

      if (error && error.message && error.message.includes('motivo_rechazo')) {
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

        const rubrosAInsertar = rubrosSeleccionados.length > 0 
          ? rubrosSeleccionados 
          : (seleccionada?.profesional_rubros?.map(item => item.rubros?.id).filter(Boolean) || []);

        if (rubrosAInsertar.length > 0) {
          const nuevasRelaciones = rubrosAInsertar.map(rId => ({
            profesional_id: id,
            rubro_id: rId
          }));
          const { error: errorInsertRubros } = await supabase
            .from('profesional_rubros')
            .insert(nuevasRelaciones);
            
          if (errorInsertRubros) throw errorInsertRubros;
        }
      }

      await cargarSolicitudes();
      setSeleccionada(null);

      if (seleccionada) {
        const telCrudo = seleccionada.whatsapp || seleccionada.telefono;
        const telLimpio = limpiarNumeroWhatsApp(telCrudo);
        const nombreProf = seleccionada.nombre_completo || seleccionada.nombre || "Profesional";
        
        if (telLimpio) {
          let mensaje = "";
          if (nuevoEstado === 'rechazado') {
            mensaje = `Hola *${nombreProf}*, nos comunicamos desde *ConectaOficios*. Te informamos que tu perfil ha sido suspendido / rechazado por el siguiente motivo: _${motivo || "No especificado"}_. Por favor, revisa los datos o la documentación solicitada. ¡Muchas gracias!`;
          } else if (nuevoEstado === 'aprobado') {
            mensaje = `Hola *${nombreProf}*, ¡excelente noticia! Nos comunicamos desde *ConectaOficios* para informarte que tu perfil ha sido aprobado / reactivado con éxito. Ya formás parte de nuestra plataforma. ¡Muchas gracias!`;
          }

          if (mensaje) {
            const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telLimpio}&text=${encodeURIComponent(mensaje)}`;
            window.open(urlWhatsApp, '_blank');
          }
        }
      }

      alert(`El registro se actualizó exitosamente a estado: ${nuevoEstado}`);

    } catch (err) {
      alert("Error al actualizar el estado en la base de datos: " + err.message);
    }
  }

  async function eliminarRegistro(id) {
    const confirmar = window.confirm("¿Estás seguro de querer eliminar este registro y su documentación permanentemente?");
    if (!confirmar) return;

    try {
      const { data: listaArchivos, error: errorListar } = await supabase.storage
        .from('documentos')
        .list(String(id), { limit: 100 });

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
        alert("Asegúrate de tener creada la función RPC en Supabase. (Detalle: " + error.message + ")");
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
      setError(false);
    } else {
      setError(true);
    }
  }

  const docEnTabla = seleccionada?.documentacion_url || seleccionada?.cv || seleccionada?.archivo || seleccionada?.documento || seleccionada?.matricula_url;

  if (!autenticado) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full rounded-sm border border-stone bg-white p-8 shadow-sm">
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
              type="submit"
              className="w-full rounded-sm bg-taller py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between border-b border-stone pb-4">
        <h1 className="font-display text-2xl font-bold text-ink">Panel de moderación</h1>
        <div className="flex items-center gap-4">
          <a
            href={`https://api.whatsapp.com/send?phone=${limpiarNumeroWhatsApp(NUMERO_WHATSAPP_ADMIN)}&text=${encodeURIComponent("Hola, contacto desde el panel de administración.")}`}
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

      {/* PESTAÑAS DE NAVEGACIÓN (Incluyendo "Educar Diccionario") */}
      <div className="mt-4 flex gap-2 border-b border-stone">
        {[
          { id: "pendiente", label: "Pendientes" },
          { id: "aprobado", label: "Aprobados" },
          { id: "rechazado", label: "Rechazados" },
          { id: "diccionario", label: "Educar Diccionario" }
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

      {/* RENDERIZADO CONDICIONAL SEGÚN LA PESTAÑA ACTIVA */}
      {tab === "diccionario" ? (
        <div className="mt-6">
          <AdminDiccionario />
        </div>
      ) : (
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
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">{seleccionada.nombre_completo || seleccionada.nombre}</h2>
                    <p className="text-sm text-ink/60">{seleccionada.email} · {seleccionada.whatsapp || seleccionada.telefono || "Sin teléfono"}</p>
                    <p className="mt-1 text-xs font-mono text-ink/50">Localidad: {seleccionada.localidad || seleccionada.direccion || "No especificada"}</p>
                  </div>

                  {(seleccionada.whatsapp || seleccionada.telefono) && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=${limpiarNumeroWhatsApp(seleccionada.whatsapp || seleccionada.telefono)}&text=${encodeURIComponent(`Hola ${seleccionada.nombre_completo || seleccionada.nombre || ""}, nos comunicamos desde ConectaOficios.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition cursor-pointer shrink-0"
                      title="Abrir chat de WhatsApp con el profesional"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>Contactar por WhatsApp</span>
                    </a>
                  )}
                </div>

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
                        onClick={() => cambiarEstado(seleccionada.id, 'aprobado', false)}
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-copper mb-3">Documentación Adjunta</h3>
                  
                  <div className="mb-3 rounded bg-stone/10 p-2 font-mono text-[11px] text-ink/70">
                    <span className="font-bold">Diagnóstico Storage ID ({seleccionada.id}):</span> {debugInfo.estado} — {debugInfo.detalle}
                  </div>

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
      )}
    </div>
  );
}