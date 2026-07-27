export default function Step4Documentos({ datos, onChange, onSubmit, onBack, enviando }) {
  const valido = datos.dni && datos.matricula;

  return (
    <div className="space-y-4">
      <ArchivoInput
        label="DNI (frente)"
        archivo={datos.dni}
        onChange={(f) => onChange({ dni: f })}
        ayuda="Formatos aceptados: PDF, JPG o PNG. Máx. 8MB."
      />
      <ArchivoInput
        label="Matrícula o certificación del oficio"
        archivo={datos.matricula}
        onChange={(f) => onChange({ matricula: f })}
        ayuda="Certificado, matrícula profesional o constancia de curso/oficio."
      />

      <p className="rounded-sm bg-blueprint/5 p-3 text-xs text-ink/60">
        Tus documentos son revisados únicamente por el equipo de moderación de
        ConectaOficios para verificar tu identidad y habilitación, y no se
        muestran públicamente.
      </p>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2.5 font-medium text-ink/60 hover:text-ink">
          Atrás
        </button>
        <button
          disabled={!valido || enviando}
          onClick={onSubmit}
          className="rounded-sm bg-copper px-6 py-2.5 font-medium text-paper transition hover:bg-copper-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </div>
  );
}

function ArchivoInput({ label, archivo, onChange, ayuda }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="mt-1 w-full rounded-sm border border-stone px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-blueprint file:px-3 file:py-1.5 file:text-paper"
      />
      {archivo && <span className="mt-1 block text-xs text-taller">Archivo listo: {archivo.name}</span>}
      {ayuda && <span className="mt-1 block text-xs text-ink/50">{ayuda}</span>}
    </label>
  );
}
