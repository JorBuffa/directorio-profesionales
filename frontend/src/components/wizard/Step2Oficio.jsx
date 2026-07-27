import { useState } from 'react';

export default function Step2Oficio({ datos, categorias, onChange, onNext, onBack }) {
  // Verificamos si seleccionó "otro" o si está escribiendo un oficio personalizado
  const [esOtro, setEsOtro] = useState(false);
  const [oficioPersonalizado, setOficioPersonalizado] = useState('');

  const categoriaSeleccionada = esOtro ? oficioPersonalizado : datos.categoria;
  const valido = categoriaSeleccionada && categoriaSeleccionada.trim().length > 0 && datos.descripcion?.length >= 20;

  const handleSelectChange = (e) => {
    const valor = e.target.value;
    if (valor === 'OTRO_CUSTOM') {
      setEsOtro(true);
      onChange({ categoria: '' }); // Limpiamos hasta que escriba el nuevo
    } else {
      setEsOtro(false);
      setOficioPersonalizado('');
      onChange({ categoria: valor });
    }
  };

  const handleCustomChange = (e) => {
    const valor = e.target.value;
    setOficioPersonalizado(valor);
    onChange({ categoria: valor });
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-ink">Tu oficio principal</span>
        <select
          value={esOtro ? 'OTRO_CUSTOM' : datos.categoria}
          onChange={handleSelectChange}
          className="mt-1 w-full rounded-sm border border-stone px-3 py-2 focus:border-copper"
        >
          <option value="">Seleccioná una categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
          <option value="OTRO_CUSTOM">Otro (Escribir mi oficio)</option>
        </select>
      </label>

      {/* Si elige "Otro", mostramos el input de texto para que pueda tipear */}
      {esOtro && (
        <label className="block">
          <span className="text-sm font-medium text-ink">Especificá tu oficio</span>
          <input
            type="text"
            value={oficioPersonalizado}
            onChange={handleCustomChange}
            placeholder="Ej: Cerrajero, Técnico Aire Acondicionado..."
            className="mt-1 w-full rounded-sm border border-stone px-3 py-2 focus:border-copper"
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium text-ink">Contanos sobre tu experiencia</span>
        <textarea
          rows={4}
          value={datos.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
          placeholder="Años de experiencia, especialidades, zonas donde trabajás..."
          className="mt-1 w-full rounded-sm border border-stone px-3 py-2 focus:border-copper"
        />
        <span className="mt-1 block text-xs text-ink/50">Mínimo 20 caracteres.</span>
      </label>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2.5 font-medium text-ink/60 hover:text-ink">
          Atrás
        </button>
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