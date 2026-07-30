import { Link } from "react-router-dom";

const categorias = [
  { nombre: "Electricista", medida: "220V" },
  { nombre: "Plomero / Gasista", medida: "Ø1/2\"" },
  { nombre: "Carpintero", medida: "18mm" },
  { nombre: "Pintor", medida: "2 manos" },
  { nombre: "Albañil", medida: "H21" },
  { nombre: "Jardinería", medida: "m²" }
];

export default function Home() {
  return (
    <div className="bg-paper min-h-screen">
      {/* HERO: Sección principal rediseñada con alto impacto y botones gigantes */}
      <section className="bg-blueprint px-4 py-16 md:py-24 text-paper text-center md:text-left border-b-4 border-copper">
        <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-2 items-center">
          
          {/* Textos y botones de acceso principal */}
          <div>
            <span className="inline-block bg-copper/20 text-copper-light border border-copper/40 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase mb-4">
              Plataforma comunitaria de oficios verificados
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl text-paper">
              Encontrá al profesional que necesitás, <br />
              <span className="text-copper underline decoration-copper/50 underline-offset-8">a la vuelta de tu casa.</span>
            </h1>
            <p className="mt-6 text-lg text-paper/90 leading-relaxed max-w-xl">
              Conectamos vecinos con electricistas, plomeros, albañiles y más de forma rápida, directa y segura. Con mapa en vivo y datos verificados.
            </p>

            {/* BOTONES GIGANTES Y DESTACADOS PARA FÁCIL ACCESO */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/buscar"
                className="rounded-lg bg-copper px-8 py-5 text-center font-bold text-paper text-lg shadow-xl transition hover:bg-copper-dark transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🔍</span>
                <span>BUSCAR UN PROFESIONAL</span>
              </Link>
              
              <Link
                to="/soy-profesional"
                className="rounded-lg bg-white/10 border-2 border-paper/60 px-8 py-5 text-center font-bold text-paper text-lg transition hover:bg-white/20 hover:border-paper flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🛠️</span>
                <span>SOY PROFESIONAL</span>
              </Link>
            </div>
          </div>

          {/* Gráfico o ilustración visual lateral simplificada */}
          <div className="hidden md:flex justify-center bg-white/5 p-8 rounded-2xl border border-white/10 shadow-inner">
            <svg viewBox="0 0 360 280" className="w-full max-w-xs drop-shadow-md">
              <circle cx="90" cy="200" r="10" fill="#E28E52" />
              <circle cx="270" cy="70" r="10" fill="#2B6E5E" />
              <line
                x1="90"
                y1="200"
                x2="270"
                y2="70"
                stroke="#E28E52"
                strokeWidth="4"
                strokeDasharray="8 8"
              />
              <text x="60" y="235" fill="#F7F5EF" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
                📍 Vos
              </text>
              <text x="230" y="45" fill="#F7F5EF" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
                👷 Profesional
              </text>
              <text x="145" y="125" fill="#E28E52" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
                1.4 km
              </text>
            </svg>
          </div>

        </div>
      </section>

      {/* SECCIÓN DE PASOS MUY CLARA */}
      <section className="bg-stone/20 py-12 border-b border-stone">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-2xl font-bold text-ink mb-8">
            ¿Cómo funciona en 3 simples pasos?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white p-6 rounded-lg border border-stone shadow-sm text-center">
              <span className="inline-block w-12 h-12 leading-12 rounded-full bg-copper text-paper font-bold text-xl mb-4">1</span>
              <h3 className="font-bold text-ink text-lg">Buscás</h3>
              <p className="mt-2 text-sm text-ink/70">Seleccionás el oficio que necesitás o usás la búsqueda inteligente.</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-stone shadow-sm text-center">
              <span className="inline-block w-12 h-12 leading-12 rounded-full bg-copper text-paper font-bold text-xl mb-4">2</span>
              <h3 className="font-bold text-ink text-lg">Comparás</h3>
              <p className="mt-2 text-sm text-ink/70">Ves los profesionales ordenados por cercanía real en el mapa.</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-stone shadow-sm text-center">
              <span className="inline-block w-12 h-12 leading-12 rounded-full bg-copper text-paper font-bold text-xl mb-4">3</span>
              <h3 className="font-bold text-ink text-lg">Contactás</h3>
              <p className="mt-2 text-sm text-ink/70">Te comunicás directamente por WhatsApp para coordinar el trabajo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías Disponibles */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-ink text-center md:text-left">
          Principales Oficios Disponibles
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {categorias.map((c) => (
            <div
              key={c.nombre}
              className="rounded-lg border-2 border-stone bg-white p-5 text-center transition hover:border-copper shadow-sm hover:shadow-md"
            >
              <p className="font-mono text-xs font-bold text-copper">{c.medida}</p>
              <p className="mt-2 font-bold text-ink text-base">{c.nombre}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}