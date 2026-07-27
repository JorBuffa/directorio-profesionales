import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient.js";

export default function SoyProfesional() {
  const navigate = useNavigate();
  const [modo, setModo] = useState("login");

  // Campos para Login
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");

  // Campos para Registro Completo
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [emailRegistro, setEmailRegistro] = useState("");
  const [passwordRegistro, setPasswordRegistro] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("Unquillo");
  
  // Coordenadas geográficas
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [geocodificando, setGeocodificando] = useState(false);

  // Datos Laborales y Rubros Dinámicos
  const [rubros, setRubros] = useState([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState("");
  const [nuevoRubro, setNuevoRubro] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Documentación desglosada
  const [dniFrente, setDniFrente] = useState(null);
  const [dniDorso, setDniDorso] = useState(null);
  const [certificadoMatricula, setCertificadoMatricula] = useState(null);
  const [certificadoBuenaConducta, setCertificadoBuenaConducta] = useState(null);

  // Estados para mostrar/ocultar contraseñas
  const [mostrarPasswordLogin, setMostrarPasswordLogin] = useState(false);
  const [mostrarPasswordRegistro, setMostrarPasswordRegistro] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Tu número de administrador configurado
  const NUMERO_ADMIN = "5492216110999";

  useEffect(() => {
    async function cargarRubros() {
      const { data, error } = await supabase.from('rubros').select('*');
      if (!error && data) {
        setRubros(data);
        if (data.length > 0) setRubroSeleccionado(data[0].id);
      }
    }
    cargarRubros();
  }, []);

  // Función para capitalizar texto simple (rubros)
  function capitalizarTexto(texto) {
    if (!texto) return "";
    const textoLimpio = texto.trim().toLowerCase();
    return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
  }

  // Función para capitalizar nombres y apellidos compuestos (ej: "jorge buffa" -> "Jorge Buffa")
  function capitalizarNombre(texto) {
    if (!texto) return "";
    return texto
      .trim()
      .toLowerCase()
      .split(" ")
      .map(palabra => palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : "")
      .join(" ");
  }

  // Función para buscar coordenadas automáticamente con Nominatim (OpenStreetMap)
  async function handleUbicarDireccion() {
    if (!direccion || !localidad) {
      alert("Por favor completa la dirección y la localidad antes de ubicar.");
      return;
    }

    setGeocodificando(true);

    try {
      const query = encodeURIComponent(`${direccion}, ${localidad}, Córdoba, Argentina`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setLatitud(lat);
        setLongitud(lon);
        alert("¡Ubicación encontrada con éxito!");
      } else {
        alert("No se encontró la dirección exacta en el mapa. Prueba ajustando el texto.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servicio de geolocalización.");
    } finally {
      setGeocodificando(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setCargando(true);
    setMensaje("");

    try {
      // 1. Intentar iniciar sesión
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: passwordLogin,
      });

      if (authError) {
        setMensaje("Email o contraseña incorrectos.");
        setCargando(false);
        return;
      }

      const userId = authData.user?.id;

      // 2. Consultar el estado del profesional
      const { data: profData, error: profError } = await supabase
        .from('profesionales')
        .select('estado, nombre_completo')
        .eq('id', userId)
        .single();

      if (profError || !profData) {
        setMensaje("No se encontró el perfil profesional asociado.");
        setCargando(false);
        return;
      }

      // 3. Evaluar si está suspendido o inactivo
      if (profData.estado === 'suspendido' || profData.estado === 'inactivo') {
        await supabase.auth.signOut(); // Cerramos sesión para que no navegue
        
        const mensajeWp = encodeURIComponent(`Hola! Soy ${profData.nombre_completo}. Mi cuenta se encuentra suspendida/inactiva y ya regularicé mi situación, quisiera solicitar la habilitación.`);

        setMensaje(
          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-sm text-center">
            <p className="text-sm font-semibold text-amber-800">⚠️ Tu cuenta se encuentra suspendida o inactiva.</p>
            <p className="text-xs text-amber-700 mt-1">Si ya realizaste el pago, comunícate con la administración para reactivarla.</p>
            <a
              href={`https://wa.me/${NUMERO_ADMIN}?text=${mensajeWp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-sm hover:bg-green-700 transition cursor-pointer"
            >
              💬 Avisar por WhatsApp que ya pagué
            </a>
          </div>
        );
        setCargando(false);
        return;
      }

      // Si está aprobado u OK, entra al sistema
      navigate("/mi-perfil");

    } catch (err) {
      console.error(err);
      setMensaje("Ocurrió un error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro(e) {
    e.preventDefault();
    setCargando(true);
    setMensaje("");

    try {
      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailRegistro,
        password: passwordRegistro,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          alert("Este correo electrónico ya está registrado. Si ya tenías cuenta, inicia sesión o comunícate con soporte.");
        } else {
          alert("Error al registrar cuenta: " + authError.message);
        }
        setCargando(false);
        return;
      }

      const userId = authData.user?.id;
      let urlDocumentacionPrincipal = null;

      // Función auxiliar para subir archivos al storage
      async function subirArchivo(file, nombrePrefijo) {
        if (!file || !userId) return null;
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${nombrePrefijo}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, file);

        if (!uploadError) {
          const { data } = supabase.storage.from('documentos').getPublicUrl(fileName);
          return data.publicUrl;
        }
        return null;
      }

      // 2. Subir los documentos requeridos
      const urlDniFrente = await subirArchivo(dniFrente, 'dni-frente');
      const urlDniDorso = await subirArchivo(dniDorso, 'dni-dorso');
      const urlMatricula = await subirArchivo(certificadoMatricula, 'matricula');
      const urlConducta = await subirArchivo(certificadoBuenaConducta, 'buena-conducta');

      urlDocumentacionPrincipal = urlDniFrente;

      // Aplicar formato prolijo al nombre completo
      const nombreFormateado = capitalizarNombre(nombreCompleto);

      // 3. Insertar datos en la tabla 'profesionales'
      const { error: dbError } = await supabase.from('profesionales').insert([
        {
          id: userId,
          user_id: userId,
          nombre_completo: nombreFormateado,
          email: emailRegistro,
          whatsapp: whatsapp,
          direccion: direccion,
          localidad: localidad,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          descripcion: descripcion,
          documentacion_url: urlDocumentacionPrincipal,
          estado: 'pendiente'
        }
      ]);

      if (dbError) {
        alert("Error al guardar el perfil: " + dbError.message);
        setCargando(false);
        return;
      }

      // 4. Gestionar el Rubro (si elige "otro" o uno existente)
      let rubroFinalId = rubroSeleccionado;

      if (rubroSeleccionado === "otro" && nuevoRubro.trim() !== "") {
        const rubroFormateado = capitalizarTexto(nuevoRubro);

        const { data: nuevoRubroData, error: errorNuevoRubro } = await supabase
          .from('rubros')
          .insert([{ nombre: rubroFormateado }])
          .select()
          .single();

        if (!errorNuevoRubro && nuevoRubroData) {
          rubroFinalId = nuevoRubroData.id;
        }
      }

      // Relacionar el rubro con el profesional
      if (rubroFinalId && rubroFinalId !== "otro" && userId) {
        await supabase.from('profesional_rubros').insert([
          {
            profesional_id: userId,
            rubro_id: rubroFinalId
          }
        ]);
      }

      // 5. Generar enlace de aviso automático al WhatsApp del Administrador
      const textoAvisoAdmin = encodeURIComponent(`Nuevo registro en ConectaOficios:\n\n👤 Nombre: ${nombreFormateado}\n📱 WhatsApp: ${whatsapp}\n📧 Email: ${emailRegistro}\n📍 Localidad: ${localidad}\n\nIngresa al panel para aprobarlo o rechazarlo.`);
      const urlWhatsAppAdmin = `https://wa.me/${NUMERO_ADMIN}?text=${textoAvisoAdmin}`;

      // Abrimos automáticamente el WhatsApp para que envíes el aviso al administrador
      window.open(urlWhatsAppAdmin, '_blank');

      alert("¡Registro exitoso! Tu cuenta y documentación quedaron pendientes de aprobación.");
      setModo("login");

    } catch (err) {
      console.error(err);
      alert("Ocurrió un error inesperado durante el registro.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      
      {/* VISTA DE LOGIN */}
      {modo === "login" && (
        <div className="rounded-sm border border-stone bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-ink">Acceso Profesional</h1>
          <p className="mt-1 text-sm text-ink/60">Ingresá con tu cuenta para gestionar tu perfil.</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Correo Electrónico</label>
              <input
                type="email"
                required
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                placeholder="tu@email.com"
                className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Contraseña</label>
              <div className="relative mt-1">
                <input
                  type={mostrarPasswordLogin ? "text" : "password"}
                  required
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-sm border border-stone px-3 py-2 pr-10 text-ink focus:border-copper focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswordLogin(!mostrarPasswordLogin)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/50 hover:text-ink cursor-pointer text-xs font-medium"
                >
                  {mostrarPasswordLogin ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-sm bg-taller py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>

            {mensaje && <div className="mt-2 text-center">{mensaje}</div>}
          </form>

          <div className="mt-6 border-t border-stone pt-4 text-center">
            <p className="text-xs text-ink/60">¿No tenés cuenta todavía?</p>
            <button
              onClick={() => setModo("registro")}
              className="mt-2 w-full rounded-sm border border-copper bg-copper/5 py-2 text-xs font-bold text-copper hover:bg-copper/10 transition cursor-pointer"
            >
              Registrarse como Nuevo Profesional
            </button>
          </div>
        </div>
      )}

      {/* VISTA DE REGISTRO COMPLETO */}
      {modo === "registro" && (
        <div className="rounded-sm border border-stone bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-ink">Registro de Profesional</h1>
          <p className="mt-1 text-sm text-ink/60">Completá tus datos, rubro y subí la documentación requerida para tu validación.</p>

          <form onSubmit={handleRegistro} className="mt-6 space-y-6">
            
            {/* 1. Datos Personales */}
            <div className="space-y-4 border-b border-stone pb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-copper">1. Datos Personales y de Acceso</h2>
              
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Jorge Buffa"
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={emailRegistro}
                  onChange={(e) => setEmailRegistro(e.target.value)}
                  placeholder="tu@email.com"
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                />
              </div>

              {/* Contraseña con Ojito en Registro */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={mostrarPasswordRegistro ? "text" : "password"}
                    required
                    value={passwordRegistro}
                    onChange={(e) => setPasswordRegistro(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-sm border border-stone px-3 py-2 pr-10 text-ink focus:border-copper focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPasswordRegistro(!mostrarPasswordRegistro)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/50 hover:text-ink cursor-pointer text-xs font-medium"
                  >
                    {mostrarPasswordRegistro ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">WhatsApp de Contacto</label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej. 3511234567"
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Dirección</label>
                <input
                  type="text"
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej. San Martín 450"
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

              {/* Botón y campos de Geolocalización integrados */}
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
            </div>

            {/* 2. Datos Laborales con Opción "Otro" */}
            <div className="space-y-4 border-b border-stone pb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-copper">2. Perfil Laboral</h2>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Rubro Principal</label>
                <select
                  value={rubroSeleccionado}
                  onChange={(e) => setRubroSeleccionado(e.target.value)}
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink bg-white focus:border-copper focus:outline-none"
                >
                  {rubros.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre || r.titulo || r.id}
                    </option>
                  ))}
                  <option value="otro">+ Otro rubro (Escribir manual)</option>
                </select>
              </div>

              {rubroSeleccionado === "otro" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-copper">Especificar Nuevo Rubro</label>
                  <input
                    type="text"
                    required
                    value={nuevoRubro}
                    onChange={(e) => setNuevoRubro(e.target.value)}
                    placeholder="Ej. Gasista Matriculado"
                    className="mt-1 w-full rounded-sm border border-copper px-3 py-2 text-ink focus:outline-none bg-copper/5"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Descripción de Servicios</label>
                <textarea
                  rows="3"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Contá brevemente tu experiencia..."
                  className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                ></textarea>
              </div>
            </div>

            {/* 3. Documentación Requerida */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-copper">3. Documentación Requerida (Imágenes o PDF)</h2>

              <div>
                <label className="block text-xs font-medium text-ink/80">DNI - Frente</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDniFrente(e.target.files[0])}
                  className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/80">DNI - Dorso</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDniDorso(e.target.files[0])}
                  className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/80">Certificado de Matrícula (Opcional o según rubro)</label>
                <input
                  type="file"
                  onChange={(e) => setCertificadoMatricula(e.target.files[0])}
                  className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/80">Certificado de Buena Conducta</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setCertificadoBuenaConducta(e.target.files[0])}
                  className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-sm bg-copper py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer mt-4"
            >
              {cargando ? "Enviando registro y documentos..." : "Completar Registro y Solicitar Ingreso"}
            </button>
          </form>

          <div className="mt-6 border-t border-stone pt-4 text-center">
            <button
              onClick={() => setModo("login")}
              className="text-xs text-copper hover:underline font-medium cursor-pointer"
            >
              ← Ya tengo cuenta, quiero iniciar sesión
            </button>
          </div>
        </div>
      )}

    </div>
  );
}