const pasos = ["Datos personales", "Tu oficio", "Ubicación", "Documentos"];

export default function StepIndicator({ actual }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {pasos.map((titulo, i) => {
        const numero = i + 1;
        const estado = numero < actual ? "hecho" : numero === actual ? "actual" : "pendiente";
        return (
          <li key={titulo} className="text-center">
            <div
              className={`mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full font-mono text-sm ${
                estado === "hecho"
                  ? "bg-taller text-paper"
                  : estado === "actual"
                  ? "bg-copper text-paper"
                  : "bg-stone text-ink/50"
              }`}
            >
              {numero}
            </div>
            <p className={`text-xs ${estado === "pendiente" ? "text-ink/40" : "text-ink/80"}`}>{titulo}</p>
          </li>
        );
      })}
    </ol>
  );
}
