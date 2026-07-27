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
    <div>
      {/* HERO: grilla de plano técnico + línea de ruta punteada, el elemento
          firma de la página, conectando un pin de profesional con el usuario. */}
      <section className="relative overflow-hidden bg-blueprint bg-blueprintGrid bg-grid">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-copper-light">
              Oficio verificado · a la distancia justa
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-paper md:text-5xl">
              El profesional que necesitás,
              <br />
              <span className="text-copper">a la vuelta de tu casa.</span>
            </h1>
            <p className="mt-5 max-w-md text-paper/70">
              Buscá electricistas, plomeros, carpinteros y más de tu zona, con
              mapa en vivo, distancia real y documentación verificada por
              nuestro equipo de moderación.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/buscar"
                className="rounded-sm bg-copper px-6 py-3 font-medium text-paper transition hover:bg-copper-dark"
              >
                Buscar un profesional
              </Link>
              <Link
                to="/soy-profesional"
                className="rounded-sm border border-paper/30 px-6 py-3 font-medium text-paper transition hover:border-copper hover:text-copper"
              >
                Quiero ofrecer mi oficio
              </Link>
            </div>
          </div>

          {/* Diagrama de "ruta" tipo plano, con el pin del profesional y el
              usuario conectados por una línea punteada y una cota de distancia. */}
          <div className="relative hidden items-center justify-center md:flex">
            <svg viewBox="0 0 360 280" className="w-full max-w-sm">
              <circle cx="90" cy="200" r="6" fill="#E28E52" />
              <circle cx="270" cy="70" r="6" fill="#2B6E5E" />
              <line
                x1="90"
                y1="200"
                x2="270"
                y2="70"
                stroke="#C46A2E"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
              <text x="60" y="230" fill="#F7F5EF" fontSize="12" fontFamily="JetBrains Mono">
                vos
              </text>
              <text x="245" y="55" fill="#F7F5EF" fontSize="12" fontFamily="JetBrains Mono">
                profesional
              </text>
              <text x="150" y="120" fill="#E28E52" fontSize="13" fontFamily="JetBrains Mono">
                1.4 km
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* Categorías: numeradas como cotas de plano, no como "01/02/03" genérico */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-ink">Oficios disponibles</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {categorias.map((c) => (
            <div
              key={c.nombre}
              className="rounded-sm border border-stone bg-white p-4 transition hover:border-copper"
            >
              <p className="font-mono text-xs text-taller">{c.medida}</p>
              <p className="mt-1 font-medium text-ink">{c.nombre}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blueprint-light/5 border-y border-stone py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          <Paso numero="1" titulo="Buscás" texto="Ingresá tu ubicación y el oficio que necesitás." />
          <Paso
            numero="2"
            titulo="Comparás"
            texto="Vas viendo profesionales ordenados por distancia real en el mapa."
          />
          <Paso
            numero="3"
            titulo="Contactás"
            texto="Elegís al profesional verificado y coordinás directamente."
          />
        </div>
      </section>
    </div>
  );
}

function Paso({ numero, titulo, texto }) {
  return (
    <div className="flex gap-4">
      <span className="font-mono text-2xl font-bold text-copper">{numero}</span>
      <div>
        <h3 className="font-display font-semibold text-ink">{titulo}</h3>
        <p className="mt-1 text-sm text-ink/60">{texto}</p>
      </div>
    </div>
  );
}
