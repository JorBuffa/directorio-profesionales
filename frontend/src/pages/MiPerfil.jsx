import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";

// =========================================================================
// CONFIGURACIÓN DE CONTACTO DE WHATSAPP DEL ADMIN
// =========================================================================
const NUMERO_WHATSAPP_ADMIN = "5492216110999";

export default function MiPerfil() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [perfil, setPerfil] = useState({
    nombre_completo: "",
    whatsapp: "",
    direccion: "",
    localidad: "",
    latitud: "",
    longitud: "",
    descripcion: "",
    estado: ""
  });
  
  const [rubros, setRubros] = useState([]);
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState([]);
  
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

  // Estados para cambiar contraseña y los ojitos
  const [mostrarModalPassword, setMostrarModalPassword] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [verNuevaPass, setVerNuevaPass] = useState(false);
  const [verConfirmarPass, setVerConfirmarPass] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  useEffect(() => {
    cargarDatosPerfil();
    cargarRubros();
  }, []);

  async function cargarRubros() {
    try {
      const { data, error } = await supabase.from('rubros').select('*').order('nombre');
      if (!error && data) setRubros(data);
    } catch (err) {
      console.error("Error al cargar rubros:", err);
    }
  }

  function capitalizarTexto(texto) {
    if (!texto) return "";
    const textoLimpio = texto.trim().toLowerCase();
    return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
  }

  function handleCheckboxRubro(rubroId) {
    if (rubrosSeleccionados.includes(rubroId)) {
      setRubrosSeleccionados(rubrosSeleccionados.filter(id => id !== rubroId));
    } else {
      setRubrosSeleccionados([...rubrosSeleccionados, rubroId]);
    }
  }

  async function cargarDatosPerfil() {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        .eq('user_id', user.id)
        .single();

      if (data) {
        const perfilObj = {
          nombre_completo: data.nombre_completo || data.nombre || "",
          whatsapp: data.whatsapp || data.telefono || "",
          direccion: data.direccion || "",
          localidad: data.localidad || "",
          latitud: data.latitud || "",
          longitud: data.longitud || "",
          descripcion: data.descripcion || "",
          estado: data.estado || "pendiente",
          id: data.id,
          email: data.email
        };
        setPerfil(perfilObj);

        if (data.profesional_rubros && data.profesional_rubros.length > 0) {
          const idsAsociados = data.profesional_rubros.map(item => item.rubros.id);
          setRubrosSeleccionados(idsAsociados);
        }

        await listarArchivosStorage(data.id, data.email);
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    } finally {
      setCargando(false);
    }
  }

  async function listarArchivosStorage(profesionalId, email) {
    try {
      const { data, error } = await supabase.storage.from('documentos').list('', { limit: 100 });
      if (!error && data) {
        const matches = data.filter(file => 
          file.name.includes(profesionalId) || 
          (email && file.name.toLowerCase().includes(email.toLowerCase().split('@')[0]))
        );

        const docsMapeados = {};

        TIPOS_DOCUMENTOS_OBLIGATORIOS.forEach(tipo => {
          // Buscamos archivos que contengan exactamente el ID del tipo (ej: dni_dorso)
          const archivoEncontrado = matches.find(file => file.name.includes(`-${tipo.id}-`) || file.name.includes(tipo.id));

          if (archivoEncontrado) {
            const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(archivoEncontrado.name);
            docsMapeados[tipo.id] = {
              nombreArchivo: archivoEncontrado.name,
              url: urlData.publicUrl
            };
          } else {
            docsMapeados[tipo.id] = null; 
          }
        });

        setDocumentosProfesional(docsMapeados);
      }
    } catch (err) {
      console.error("Error al listar archivos:", err);
    }
  }

  async function handleGuardarCambios(e) {
    e.preventDefault();
    try {
      setGuardando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profesionales')
        .update({
          nombre_completo: perfil.nombre_completo,
          whatsapp: perfil.whatsapp,
          direccion: perfil.direccion,
          localidad: perfil.localidad,
          latitud: perfil.latitud,
          longitud: perfil.longitud,
          descripcion: perfil.descripcion
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.from('profesional_rubros').delete().eq('profesional_id', perfil.id);
      
      if (rubrosSeleccionados.length > 0) {
        const nuevasRelaciones = rubrosSeleccionados.map(rId => ({
          profesional_id: perfil.id,
          rubro_id: rId
        }));
        await supabase.from('profesional_rubros').insert(nuevasRelaciones);
      }

      alert("¡Cambios guardados correctamente!");
    } catch (err) {
      alert("Error al guardar los cambios: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  // Subir documento individual reemplazando el anterior si ya existía uno viejo
  async function handleSubirIndividual(tipoId) {
    const archivo = archivosSeleccionados[tipoId];
    if (!archivo) {
      alert("Primero seleccioná un archivo para este casillero.");
      return;
    }

    try {
      setSubiendoTipo(tipoId);

      // 1. Si ya había un archivo previo de este tipo en el storage, lo borramos primero para que no quede obsoleto
      const documentoAnterior = documentosProfesional[tipoId];
      if (documentoAnterior && documentoAnterior.nombreArchivo) {
        await supabase.storage.from('documentos').remove([documentoAnterior.nombreArchivo]);
      }

      // 2. Subimos el nuevo archivo con nomenclatura limpia y estricta
      const fileExt = archivo.name.split('.').pop();
      const nombreArchivo = `${perfil.id}-${tipoId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(nombreArchivo, archivo);

      if (uploadError) throw uploadError;

      // 3. Actualizamos el estado del profesional a pendiente
      await supabase
        .from('profesionales')
        .update({ estado: 'pendiente' })
        .eq('id', perfil.id);

      setArchivosSeleccionados(prev => ({ ...prev, [tipoId]: null }));
      setPerfil(prev => ({ ...prev, estado: 'pendiente' }));

      alert("¡Documento subido y actualizado con éxito!");
      await listarArchivosStorage(perfil.id, perfil.email);
    } catch (err) {
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setSubiendoTipo(null);
    }
  }

  function handleNotificarAdmin() {
    const nombreProf = perfil.nombre_completo || "Profesional";
    const mensajeAdmin = `⚠️ *AVISO DE REVISIÓN DE DOCUMENTACIÓN*:\nEl profesional *${nombreProf}* ha actualizado/subido su documentación y solicita revisión en el panel.`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=${encodeURIComponent(mensajeAdmin)}`, '_blank');
  }

  async function handleEliminarArchivo(tipoId) {
    const docInfo = documentosProfesional[tipoId];
    if (!docInfo) return;

    if (!window.confirm("¿Estás seguro de eliminar este documento?")) return;
    try {
      const { error } = await supabase.storage.from('documentos').remove([docInfo.nombreArchivo]);
      if (error) throw error;
      
      setDocumentosProfesional(prev => ({
        ...prev,
        [tipoId]: null
      }));

      alert("Archivo eliminado correctamente.");
      await listarArchivosStorage(perfil.id, perfil.email);
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }

  async function handleCambiarPassword(e) {
    e.preventDefault();
    if (!nuevaPassword || nuevaPassword.length < 6) {
      alert("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    try {
      setGuardandoPassword(true);
      const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
      if (error) throw error;

      alert("¡Contraseña actualizada con éxito!");
      setNuevaPassword("");
      setConfirmarPassword("");
      setMostrarModalPassword(false);
    } catch (err) {
      alert("Error al actualizar la contraseña: " + err.message);
    } finally {
      setGuardandoPassword(false);
    }
  }

  async function handleCerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/"; 
  }

  if (cargando) {
    return <div className="p-8 text-center text-ink/60">Cargando perfil…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* CABECERA CON BOTONES DE ACCESO RÁPIDO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone pb-4 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Mi Perfil Profesional</h1>
          <p className="text-xs uppercase tracking-wider text-copper mt-1">
            ESTADO DE CUENTA: {perfil.estado.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarModalPassword(!mostrarModalPassword)}
            className="rounded-sm bg-stone/20 border border-stone px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/30 cursor-pointer transition"
          >
            🔑 Cambiar Clave
          </button>
          <button
            type="button"
            onClick={handleCerrarSesion}
            className="rounded-sm border border-copper px-3 py-1.5 text-xs font-medium text-copper hover:bg-copper hover:text-white cursor-pointer transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {mostrarModalPassword && (
        <div className="mt-4 rounded-sm border border-copper/40 bg-copper/5 p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-copper mb-2">Modificar contraseña de acceso</h3>
          <form onSubmit={handleCambiarPassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={verNuevaPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  className="w-full rounded-sm border border-stone bg-white px-3 py-1.5 pr-10 text-xs text-ink focus:border-copper focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVerNuevaPass(!verNuevaPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink/60 hover:text-ink cursor-pointer px-1"
                >
                  {verNuevaPass ? "🙈 Ocultar" : "👁️ Ver"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  type={verConfirmarPass ? "text" : "password"}
                  placeholder="Repetir contraseña"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="w-full rounded-sm border border-stone bg-white px-3 py-1.5 pr-10 text-xs text-ink focus:border-copper focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVerConfirmarPass(!verConfirmarPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink/60 hover:text-ink cursor-pointer px-1"
                >
                  {verConfirmarPass ? "🙈 Ocultar" : "👁️ Ver"}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMostrarModalPassword(false)}
                className="rounded-sm px-3 py-1 text-xs text-ink/60 hover:text-ink cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoPassword}
                className="rounded-sm bg-copper px-3 py-1 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
              >
                {guardandoPassword ? "Guardando..." : "Guardar clave"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FORMULARIO DE DATOS PRINCIPALES */}
      <form onSubmit={handleGuardarCambios} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-1">Nombre y Apellido</label>
          <input
            type="text"
            value={perfil.nombre_completo}
            onChange={(e) => setPerfil({ ...perfil, nombre_completo: e.target.value })}
            className="w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-1">WhatsApp / Teléfono</label>
          <input
            type="text"
            value={perfil.whatsapp}
            onChange={(e) => setPerfil({ ...perfil, whatsapp: e.target.value })}
            className="w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-2">
            Rubros u Oficios (Seleccioná uno o varios)
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-stone/5 rounded border border-stone/30">
            {rubros.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-xs text-ink cursor-pointer bg-white p-2 rounded border border-stone/20 hover:border-copper">
                <input
                  type="checkbox"
                  value={r.id}
                  checked={rubrosSeleccionados.includes(r.id)}
                  onChange={() => handleCheckboxRubro(r.id)}
                  className="rounded border-stone text-copper focus:ring-copper"
                />
                {capitalizarTexto(r.nombre || r.titulo)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-1">Dirección</label>
          <input
            type="text"
            value={perfil.direccion}
            onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })}
            className="w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-1">Localidad</label>
          <input
            type="text"
            value={perfil.localidad}
            onChange={(e) => setPerfil({ ...perfil, localidad: e.target.value })}
            className="w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-sm border border-stone/40 p-4 bg-stone/5">
          <div className="col-span-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-ink/70">Geolocalización en el mapa</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Latitud</label>
            <input
              type="text"
              value={perfil.latitud}
              onChange={(e) => setPerfil({ ...perfil, latitud: e.target.value })}
              className="w-full rounded-sm border border-stone bg-white px-3 py-1.5 text-xs text-ink focus:border-copper focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Longitud</label>
            <input
              type="text"
              value={perfil.longitud}
              onChange={(e) => setPerfil({ ...perfil, longitud: e.target.value })}
              className="w-full rounded-sm border border-stone bg-white px-3 py-1.5 text-xs text-ink focus:border-copper focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-1">Descripción de Servicios</label>
          <textarea
            rows={4}
            value={perfil.descripcion}
            onChange={(e) => setPerfil({ ...perfil, descripcion: e.target.value })}
            className="w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-sm bg-copper py-2.5 font-medium text-white hover:opacity-90 cursor-pointer shadow-xs transition"
        >
          {guardando ? "Guardando cambios..." : "Guardar Cambios"}
        </button>
      </form>

      {/* GESTIÓN DE DOCUMENTACIÓN */}
      <div className="mt-8 rounded-sm border border-stone/40 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-copper">Gestión de Documentación</h3>
        <p className="text-xs text-ink/60 mt-1">Cargá de forma independiente los documentos que tengas pendientes. Al finalizar, enviá el aviso al administrador.</p>

        <div className="mt-4 space-y-3">
          {TIPOS_DOCUMENTOS_OBLIGATORIOS.map((tipo) => {
            const doc = documentosProfesional[tipo.id];
            const archivoSeleccionadoParaEste = archivosSeleccionados[tipo.id];
            const estaSubiendoEste = subiendoTipo === tipo.id;

            return (
              <div key={tipo.id} className="rounded-sm border border-stone/30 p-3 bg-stone/5 space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink min-w-[150px] uppercase">
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
                        className="rounded-sm bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {/* Selector individual para rellenar o actualizar el casillero */}
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
                    {estaSubiendoEste ? "Actualizando..." : (doc ? "Actualizar este archivo" : "Subir este archivo")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTÓN GENERAL PARA AVISAR AL ADMIN POR WHATSAPP */}
        <div className="mt-6 border-t border-stone/20 pt-4 text-center">
          <p className="text-xs text-ink/60 mb-3">¿Ya terminaste de actualizar tus documentos? Enviá el aviso definitivo al administrador.</p>
          <button
            type="button"
            onClick={handleNotificarAdmin}
            className="w-full rounded-sm bg-emerald-600 py-2.5 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer shadow-xs transition"
          >
            📲 Notificar al Administrador por WhatsApp (Revisión Completa)
          </button>
        </div>
      </div>
    </div>
  );
}