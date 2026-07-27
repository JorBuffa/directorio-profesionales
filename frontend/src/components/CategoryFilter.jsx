export default function CategoryFilter({ categorias, activa, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("")}
        className={`rounded-sm border px-3 py-1.5 text-sm font-medium transition ${
          activa === ""
            ? "border-copper bg-copper text-paper"
            : "border-stone text-ink/70 hover:border-copper"
        }`}
      >
        Todos
      </button>
      {categorias.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={`rounded-sm border px-3 py-1.5 text-sm font-medium transition ${
            activa === c.id
              ? "border-copper bg-copper text-paper"
              : "border-stone text-ink/70 hover:border-copper"
          }`}
        >
          {c.nombre}
        </button>
      ))}
    </div>
  );
}
