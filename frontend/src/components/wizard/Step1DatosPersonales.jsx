export default function Step1DatosPersonales({ datos, onChange, onNext }) {
  const valido = datos.nombre && datos.email && datos.password?.length >= 8 && datos.telefono;

  return (
    <div className="space-y-4">
      <Campo
        label="Nombre y apellido"
        value={datos.nombre}
        onChange={(v) => onChange({ nombre: v })}
        placeholder="Ej: Marisa Gómez"
      />
      <Campo
        label="Email"
        type="email"
        value={datos.email}
        onChange={(v) => onChange({ email: v })}
        placeholder="tu@email.com"
      />
      <Campo
        label="Contraseña"
        type="password"
        value={datos.password}
        onChange={(v) => onChange({ password: v })}
        placeholder="Mínimo 8 caracteres"
        ayuda="La usarás para consultar el estado de tu solicitud en /mi-perfil."
      />
      <Campo
        label="Teléfono de contacto"
        value={datos.telefono}
        onChange={(v) => onChange({ telefono: v })}
        placeholder="Ej: 351 555-0123"
      />

      <div className="flex justify-end pt-2">
        <button
          disabled={!valido}
          onClick={onNext}
          className="rounded-sm bg-copper px-6 py-2.5 font-medium text-paper transition hover:bg-copper-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, type = "text", placeholder, ayuda }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-stone px-3 py-2 focus:border-copper"
      />
      {ayuda && <span className="mt-1 block text-xs text-ink/50">{ayuda}</span>}
    </label>
  );
}
