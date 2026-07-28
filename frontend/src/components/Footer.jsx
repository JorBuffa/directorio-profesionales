export default function Footer() {
  return (
    <footer className="border-t border-stone bg-paper">
      
      {/* Banner de invitación para acceso directo en celulares */}
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-2">
        <div className="rounded-sm border border-stone bg-stone/10 p-4 text-center shadow-sm">
          <h3 className="font-display text-sm font-bold text-ink mb-1">
            📱 ¡Llevá ConectaOficios siempre a mano!
          </h3>
          <p className="text-[11px] text-ink/70 leading-relaxed max-w-lg mx-auto">
            Para tener una respuesta rápida ante cualquier urgencia en la zona, tocá el menú de tu navegador (los tres puntitos <strong>⋮</strong>) y elegí <strong className="text-copper">"Agregar a la pantalla principal"</strong> o <strong className="text-copper">"Instalar aplicación"</strong>.
          </p>
        </div>
      </div>

      {/* Pie de página tradicional */}
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between px-4 py-8 text-sm text-ink/60 gap-4 text-center sm:text-left">
        
        {/* Lado izquierdo */}
        <div>
          <span className="font-bold text-ink">ConectaOficios</span> — Mano de Obras y Servicios Profesionales
        </div>

        {/* Lado derecho */}
        <div className="text-ink/80 font-medium">
          © 2026 PiPis3D — Todos los derechos reservados
        </div>

      </div>
    </footer>
  );
}