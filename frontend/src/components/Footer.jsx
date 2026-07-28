export default function Footer() {
  return (
    <footer className="border-t border-stone bg-paper">
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