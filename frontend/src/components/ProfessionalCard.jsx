export default function ProfessionalCard({ profesional, distanciaKm, seleccionado, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-sm border p-4 text-left transition ${
        seleccionado ? "border-copper bg-copper/5" : "border-stone bg-white hover:border-copper/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display font-semibold text-ink">{profesional.nombre}</p>
          <p className="text-xs uppercase tracking-wide text-taller">{profesional.categoria}</p>
        </div>
        {typeof distanciaKm === "number" && (
          <span className="whitespace-nowrap rounded-sm bg-blueprint px-2 py-1 font-mono text-xs text-copper-light">
            {distanciaKm.toFixed(1)} km
          </span>
        )}
      </div>
      {profesional.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-ink/60">{profesional.descripcion}</p>
      )}
      {profesional.telefono && (
        <p className="mt-2 font-mono text-xs text-ink/50">Tel: {profesional.telefono}</p>
      )}
    </button>
  );
}
