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

  // Datos Laborales y Rubros Múltiples
  const [rubros, setRubros] = useState([]);
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState([]);
  const [nuevoRubro, setNuevoRubro] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Documentación desglosada
  const [dniFrente, setDniFrente] = useState(null);
  const [dniDorso, setDniDorso] = useState(null);
  const [certificadoMatricula, setCertificadoMatricula] = useState(null);
  const [certificadoBuenaConducta, setCertificadoBuenaConducta] = useState(null);

  // Estado para el Acuerdo de Mantenimiento y Aporte Mensual
  const [aceptoContrato, setAceptoContrato] = useState(false);

  // Estados para mostrar/ocultar contraseñas
  const [mostrarPasswordLogin, setMostrarPasswordLogin] = useState(false);
  const [mostrarPasswordRegistro, setMostrarPasswordRegistro] = useState(false);

  // Estados de control
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Estado para mostrar opciones y enlace al administrador tras el registro exitoso
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [enlaceAdminWp, setEnlaceAdminWp] = useState("");

  // Tu número de administrador configurado
  const NUMERO_ADMIN = "5492216110999";

  useEffect(() => {
    async function cargarRubros() {
      const { data, error } = await supabase.from('rubros').select('*');
      if (!error && data) {
        setRubros(data);
      }
    }
    cargarRubros();
  }, []);

  function capitalizarTexto(texto) {
    if (!texto) return "";
    const textoLimpio = texto.trim().toLowerCase();
    return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
  }

  function capitalizarNombre(texto) {
    if (!texto) return "";
    return texto
      .trim()
      .toLowerCase()
      .split(" ")
      .map(palabra => palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : "")
      .join(" ");
  }

  // Función de validación de archivos para proteger el almacenamiento gratuito (máx 5MB y formatos seguros)
  function manejarCambioArchivo(e, setterArchivo) {
    const archivo = e.target.files[0];
    if (!archivo) {
      setterArchivo(null);
      return;
    }

    const TAMANO_MAXIMO = 5 * 1024 * 1024;
    if (archivo.size > TAMANO_MAXIMO) {
      alert("El archivo es demasiado pesado. El tamaño máximo permitido es de 5 MB para cuidar el almacenamiento.");
      e.target.value = "";
      setterArchivo(null);
      return;
    }

    const extensionesValidas = ["jpg", "jpeg", "png", "webp", "pdf"];
    const ext = archivo.name.split(".").pop().toLowerCase();
    if (!extensionesValidas.includes(ext)) {
      alert("Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF.");
      e.target.value = "";
      setterArchivo(null);
      return;
    }

    setterArchivo(archivo);
  }

  function handleCheckboxRubro(rubroId) {
    if (rubrosSeleccionados.includes(rubroId)) {
      setRubrosSeleccionados(rubrosSeleccionados.filter(id => id !== rubroId));
    } else {
      setRubrosSeleccionados([...rubrosSeleccionados, rubroId]);
    }
  }

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
        setLatitud(parseFloat(data[0].lat));
        setLongitud(parseFloat(data[0].lon));
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

      if (profData.estado === 'suspendido' || profData.estado === 'inactivo') {
        await supabase.auth.signOut();
        
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

      navigate("/mi-perfil");

    } catch (err) {
      console.error(err);
      setMensaje("Ocurrió un error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  // REGISTRO DIRECTO Y ÁGIL PARA EL PROFESIONAL (SIN CREAR RUBROS AUTOMÁTICOS)
  async function handleRegistro(e) {
    e.preventDefault();
    
    if (!nombreCompleto || !emailRegistro || !passwordRegistro || !whatsapp) {
      alert("Por favor completá los campos obligatorios de acceso.");
      return;
    }

    if (rubrosSeleccionados.length === 0 && !nuevoRubro.trim()) {
      alert("Por favor selecciona al menos un rubro u oficio o escribe uno manual.");
      return;
    }

    if (!aceptoContrato) {
      alert("Debes aceptar el compromiso de mantenimiento y aporte mensual para continuar.");
      return;
    }

    setCargando(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailRegistro,
        password: passwordRegistro,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          alert("Este correo electrónico ya está registrado. Inicia sesión o usa otro correo.");
        } else {
          alert("Error al registrar cuenta: " + authError.message);
        }
        setCargando(false);
        return;
      }

      const userId = authData.user?.id;
      let urlDocumentacionPrincipal = null;

      async function subirArchivo(file, nombrePrefijo) {
        if (!file || !userId) return null;
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${nombrePrefijo}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, file, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('documentos').getPublicUrl(fileName);
          return data.publicUrl;
        }
        return null;
      }

      const urlDniFrente = await subirArchivo(dniFrente, 'dni_frente');
      const urlDniDorso = await subirArchivo(dniDorso, 'dni_dorso');
      const urlMatricula = await subirArchivo(certificadoMatricula, 'matricula');
      const urlConducta = await subirArchivo(certificadoBuenaConducta, 'buena_conducta');

      urlDocumentacionPrincipal = urlDniFrente;
      const nombreFormateado = capitalizarNombre(nombreCompleto);
      const rubroManualLimpio = nuevoRubro.trim() !== "" ? capitalizarTexto(nuevoRubro) : null;

      // 1. Guardar el perfil incluyendo el rubro personalizado a evaluar
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
          rubro_personalizado: rubroManualLimpio, // Queda pendiente para revisión administrativa
          estado: 'pendiente'
        }
      ]);

      if (dbError) {
        alert("Error al guardar el perfil: " + dbError.message);
        setCargando(false);
        return;
      }

      // 2. Asociar únicamente los rubros oficiales seleccionados en las casillas
      if (rubrosSeleccionados.length > 0 && userId) {
        const relacionesARecordar = rubrosSeleccionados.map(rId => ({
          profesional_id: userId,
          rubro_id: rId
        }));

        await supabase.from('profesional_rubros').insert(relacionesARecordar);
      }

      // 3. Preparar mensaje para el WhatsApp del Administrador incluyendo el rubro manual si existe
      const textoRubroManualAdicional = rubroManualLimpio ? `\n🛠️ Rubro sugerido a mano: *${rubroManualLimpio}*` : "";
      const textoAvisoAdmin = encodeURIComponent(`Hola! Acabo de registrarme en Conecta Oficios:\n\n👤 Nombre: ${nombreFormateado}\n📱 WhatsApp: ${whatsapp}\n📧 Email: ${emailRegistro}\n📍 Localidad: ${localidad}${textoRubroManualAdicional}\n\nQuedo a la espera de la aprobación.`);
      
      setEnlaceAdminWp(`https://wa.me/${NUMERO_ADMIN}?text=${textoAvisoAdmin}`);
      setRegistroExitoso(true);

    } catch (err) {
      console.error(err);
      alert("Ocurrió un error inesperado al guardar el registro.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 relative">
      
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
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Contraseña</label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!emailLogin) {
                      alert("Por favor, escribí primero tu correo electrónico arriba para poder recuperar tu contraseña.");
                      return;
                    }
                    const confirmar = window.confirm(`¿Querés enviar un correo de recuperación para la cuenta: ${emailLogin}?`);
                    if (!confirmar) return;

                    setCargando(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(emailLogin, {
                      redirectTo: `${window.location.origin}/actualizar-contrasena`,
                    });
                    setCargando(false);

                    if (error) {
                      alert("Error al enviar el correo: " + error.message);
                    } else {
                      alert("¡Correo enviado con éxito! Revisá tu bandeja de entrada o correo no deseado para restablecer tu contraseña.");
                    }
                  }}
                  className="text-[11px] text-copper hover:underline font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  💬 ¿Olvidaste tu contraseña?
                </button>
              </div>
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
              type="button"
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
          <p className="mt-1 text-sm text-ink/60">Completá tus datos, rubros y subí la documentación requerida para tu validación.</p>

          {registroExitoso ? (
            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-sm text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="font-display text-lg font-bold text-green-800">¡Registro Exitoso!</h3>
              <p className="text-xs text-green-700 leading-relaxed">
                Tus datos fueron guardados correctamente y tu cuenta quedó pendiente de revisión. Tocá el botón para enviar los datos a Conecta Oficios por WhatsApp y activar tu perfil:
              </p>
              
              <div className="pt-2 space-y-2">
                <a
                  href={enlaceAdminWp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-3 rounded-sm transition shadow-sm text-center cursor-pointer"
                >
                  💬 Enviar datos de registro por WhatsApp a Conecta Oficios
                </a>
                
                <button
                  type="button"
                  onClick={() => { setRegistroExitoso(false); setModo("login"); }}
                  className="block w-full bg-stone/20 hover:bg-stone/30 text-ink text-xs font-bold py-2.5 rounded-sm transition cursor-pointer"
                >
                  Ir a Iniciar Sesión
                </button>
              </div>
            </div>
          ) : (
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
                  <label className="block text-xs font-medium uppercase tracking-wider text-ink/60">Correo Electrónico (Tu Usuario)</label>
                  <input
                    type="email"
                    required
                    value={emailRegistro}
                    onChange={(e) => setEmailRegistro(e.target.value)}
                    placeholder="tu@email.com"
                    className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-ink focus:border-copper focus:outline-none"
                  />
                </div>

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

              {/* 2. Perfil Laboral (Rubros Múltiples) */}
              <div className="space-y-4 border-b border-stone pb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-copper">2. Perfil Laboral (Rubros u Oficios)</h2>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-ink/60 mb-2">
                    Selecciona uno o varios rubros en los que trabajas:
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
                  <label className="block text-xs font-medium uppercase tracking-wider text-copper">¿Falta algún rubro? Escribirlo manual (Opcional)</label>
                  <input
                    type="text"
                    value={nuevoRubro}
                    onChange={(e) => setNuevoRubro(e.target.value)}
                    placeholder="Ej. Gasista Matriculado"
                    className="mt-1 w-full rounded-sm border border-copper px-3 py-2 text-ink focus:outline-none bg-copper/5"
                  />
                  <p className="text-[11px] text-ink/50 mt-1">
                    Si escribes uno aquí, no se creará solo; la administración lo evaluará para crearlo u ordenarlo correctamente.
                  </p>
                </div>

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
              <div className="space-y-4 border-b border-stone pb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-copper">3. Documentación Requerida (Imágenes o PDF - Máx 5MB)</h2>

                <div>
                  <label className="block text-xs font-medium text-ink/80">DNI - Frente (selfie con dni en mano)</label>
                  <input
                    type="file"
                    required
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => manejarCambioArchivo(e, setDniFrente)}
                    className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/80">DNI - Dorso</label>
                  <input
                    type="file"
                    required
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => manejarCambioArchivo(e, setDniDorso)}
                    className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/80">Certificado de Matrícula (Opcional)</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => manejarCambioArchivo(e, setCertificadoMatricula)}
                    className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/80">Currículum Vitae</label>
                  <input
                    type="file"
                    required
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => manejarCambioArchivo(e, setCertificadoBuenaConducta)}
                    className="mt-1 w-full text-xs text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:font-semibold file:bg-copper/10 file:text-copper hover:file:bg-copper/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* 4. ACUERDO DE MANTENIMIENTO Y APORTE MENSUAL */}
              <div className="p-4 bg-stone/10 border border-stone/30 rounded-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-copper">
                  4. Acuerdo de Vinculación y Mantenimiento
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Para mantener tu perfil activo, visibilidad y soporte en la plataforma, se requiere un aporte mensual de mantenimiento cuyo monto se coordina vía WhatsApp. Puedes consultar los detalles completos en el{" "}
                  <a 
                    href="/Contrato_Mantenimiento_Profesional_ConectaOficios.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-copper font-bold underline hover:text-ink cursor-pointer"
                  >
                    Contrato en PDF
                  </a>.
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={aceptoContrato}
                    onChange={(e) => setAceptoContrato(e.target.checked)}
                    className="mt-0.5 rounded border-stone text-copper focus:ring-copper cursor-pointer"
                  />
                  <span className="text-xs font-medium text-ink">
                    He leído, comprendido y acepto los términos del acuerdo de mantenimiento y aporte mensual de Conecta Oficios.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={cargando || !aceptoContrato}
                className="w-full rounded-sm bg-copper py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? "Guardando Registro..." : "Registrarse Ahora"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-stone pt-4 text-center">
            <button
              type="button"
              onClick={() => setModo("login")}
              className="text-xs text-copper hover:underline font-medium cursor-pointer"
            >
              ← Ya tengo cuenta, quiero iniciar sesión
            </button>
          </div>
        </div>
      )}

      {/* TEXTO PEQUEÑO COLOCADO SIEMPRE AL PIE DE TODO */}
      <p className="mt-3 text-center text-[11px] text-ink/50 italic px-2">
        * Recordar tener a mano archivos de DNI (Frontal/Dorso), currículum vitae y documentación requerida (máximo 5 MB por archivo).
      </p>

    </div>
  );
}