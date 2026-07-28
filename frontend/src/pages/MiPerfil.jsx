import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient.js";

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
  const [rubroSeleccionado, setRubroSeleccionado] = useState("");
  const [archivosStorage, setArchivosStorage] = useState([]);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

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
        setPerfil({
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
        });

        if (data.profesional_rubros && data.profesional_rubros.length > 0) {
          setRubroSeleccionado(data.profesional_rubros[0].rubros.id);
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
        const conUrl = matches.map(file => {
          const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(file.name);
          return { nombre: file.name, url: urlData.publicUrl };
        });
        setArchivosStorage(conUrl);
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

      if (rubroSeleccionado) {
        await supabase.from('profesional_rubros').delete().eq('profesional_id', perfil.id);
        await supabase.from('profesional_rubros').insert([{ profesional_id: perfil.id, rubro_id: rubroSeleccionado }]);
      }

      alert("¡Cambios guardados correctamente!");
    } catch (err) {
      alert("Error al guardar los cambios: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleSubirDocumento(e) {
    e.preventDefault();
    if (!nuevoArchivo) {
      alert("Seleccioná un archivo primero.");
      return;
    }

    try {
      setSubiendoArchivo(true);
      const nombreArchivo = `${perfil.id}_${Date.now()}_${nuevoArchivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(nombreArchivo, nuevoArchivo);

      if (uploadError) throw uploadError;

      await supabase
        .from('profesionales')
        .update({ estado: 'pendiente' })
        .eq('id', perfil.id);

      setPerfil(prev => ({ ...prev, estado: 'pendiente' }));
      setNuevoArchivo(null);
      alert("¡Documento subido con éxito y enviado a revisión!");
      await listarArchivosStorage(perfil.id, perfil.email);
    } catch (err) {
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  async function handleEliminarArchivo(nombreArchivo) {
    if (!window.confirm("¿Estás seguro de eliminar este archivo?")) return;
    try {
      const { error } = await supabase.storage.from('documentos').remove([nombreArchivo]);
      if (error) throw error;
      alert("Archivo eliminado.");
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
    // Redirige a la pantalla de inicio o login y limpia cualquier estado de sesión
    window.location.href = "/"; 
  }

  if (cargando) {
    return <div className="p-8 text-center text-ink/60">Cargando perfil…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* CABECERA CON BOTONES DE ACCESO RÁPIDO ARRIBA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone pb-4 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Mi Perfil Profesional</h1>
          <p className="text-xs uppercase tracking-wider text-copper mt-1">
            ESTADO DE CUENTA: {perfil.estado.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarModalPassword(!mostrarModalPassword)}
            className="rounded-sm bg-stone/20 border border-stone px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/30 cursor-pointer transition"
          >
            🔑 Cambiar Clave
          </button>
          <button
            onClick={handleCerrarSesion}
            className="rounded-sm border border-copper px-3 py-1.5 text-xs font-medium text-copper hover:bg-copper hover:text-white cursor-pointer transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* DESPLEGABLE / FORMULARIO RÁPIDO PARA CAMBIAR CONTRASEÑA CON OJITOS */}
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
          <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-1">Rubro / Oficio</label>
          <select
            value={rubroSeleccionado}
            onChange={(e) => setRubroSeleccionado(e.target.value)}
            className="w-full rounded-sm border border-stone bg-white px-3 py-2 text-ink focus:border-copper focus:outline-none text-sm"
          >
            <option value="" disabled>Seleccioná tu rubro</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}
              </option>
            ))}
          </select>
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
        <p className="text-xs text-ink/60 mt-1">Visualizá tus documentos actuales, eliminalos si están desactualizados o subí un archivo nuevo para reactivar tu cuenta.</p>

        <div className="mt-4 space-y-2">
          {archivosStorage.length === 0 ? (
            <p className="text-xs text-ink/40 italic">No hay archivos vinculados.</p>
          ) : (
            archivosStorage.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-sm border border-stone/30 p-2 bg-stone/5">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-ink hover:underline truncate max-w-[70%]">
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
          )}
        </div>

        <form onSubmit={handleSubirDocumento} className="mt-6 border-t border-stone/20 pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Subir nuevo documento de actualización</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              onChange={(e) => setNuevoArchivo(e.target.files[0])}
              className="text-xs text-ink file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-stone/20 file:text-ink hover:file:bg-stone/30 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={subiendoArchivo || !nuevoArchivo}
            className="mt-3 w-full rounded-sm bg-taller py-2 text-xs font-medium text-paper hover:opacity-90 cursor-pointer shadow-xs transition disabled:opacity-50"
          >
            {subiendoArchivo ? "Subiendo..." : "Subir archivo y enviar a revisión"}
          </button>
        </form>
      </div>
    </div>
  );
}