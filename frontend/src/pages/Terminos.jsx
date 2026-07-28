import { useNavigate } from "react-router-dom";

export default function Terminos() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Botón de retorno a la pantalla de búsqueda */}
      <button
        onClick={() => navigate("/buscar")}
        className="mb-6 inline-flex items-center gap-2 rounded-sm border border-stone bg-white px-4 py-2 text-xs font-medium text-ink hover:border-copper hover:text-copper transition cursor-pointer"
      >
        ← Volver a la pantalla de búsqueda
      </button>

      {/* Contenedor principal de texto legal */}
      <div className="rounded-sm border border-stone bg-white p-8 shadow-sm space-y-6">
        <h1 className="font-display text-2xl font-bold text-ink border-b border-stone pb-4">
          Términos y Condiciones de Uso – ConectaOficios
        </h1>

        <div className="space-y-4 text-sm text-ink/80 leading-relaxed">
          <div>
            <h2 className="font-bold text-ink text-base mb-1">1. ¿Qué es ConectaOficios?</h2>
            <p>
              ConectaOficios es una plataforma tecnológica de intermediación diseñada con un propósito solidario y comunitario: conectar de manera directa y ágil a personas que ofrecen diversos oficios y servicios profesionales con usuarios que necesitan contratarlos de forma inmediata. Nuestro objetivo es potenciar las oportunidades de trabajo local y brindar a los vecinos la comodidad de hallar soluciones a un solo clic.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-ink text-base mb-1">2. Naturaleza del servicio y rol de la plataforma</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Intermediación tecnológica:</strong> ConectaOficios actúa exclusivamente como un canal de comunicación y directorio digital. Nosotros no contratamos, empleamos, supervisamos ni controlamos a los profesionales que se anuncian en la plataforma.</li>
              <li><strong>Autonomía de las partes:</strong> Cualquier acuerdo, contratación, presupuesto, horario o modalidad de pago se realiza de forma directa y exclusiva entre el cliente (usuario) y el profesional. La plataforma no interviene en las transacciones económicas ni forma parte del vínculo laboral o comercial que entre ellos se genere.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-ink text-base mb-1">3. Mantenimiento de la plataforma y colaboración de los profesionales</h2>
            <p>
              Para garantizar la operatividad continua, el soporte tecnológico, la moderación de datos y la permanencia activa de los perfiles en la base de datos, los profesionales registrados realizan una mínima contribución o donación mensual destinada exclusivamente al sostenimiento y funcionamiento de la plataforma web. Esta colaboración es de carácter administrativo para el mantenimiento del servicio y no constituye una relación laboral ni un arancel por intermediación de contratos particulares.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-ink text-base mb-1">4. Exclusión de responsabilidad</h2>
            <p>Debido a que ConectaOficios funciona meramente como un espacio de encuentro:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>No nos hacemos responsables</strong> por la calidad, el resultado, los tiempos, ni la ejecución de los trabajos realizados por los profesionales registrados.</li>
              <li><strong>No asumimos responsabilidad</strong> por daños materiales, pérdidas, hurtos, incumplimientos, accidentes o cualquier tipo de inconveniente, conflicto o desacuerdo que pueda surgir entre el usuario y el profesional antes, durante o después de la prestación del servicio.</li>
              <li>Recomendamos a los usuarios tomar las precauciones habituales de seguridad y sentido común al contratar o recibir a un profesional en su domicilio.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-ink text-base mb-1">5. Compromiso de los usuarios y profesionales</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Los profesionales registrados son los únicos responsables de la veracidad de sus datos, de contar con las herramientas adecuadas, de mantener una conducta respetuosa y ética, y de cumplir con su colaboración para el mantenimiento del servicio.</li>
              <li>Los usuarios se comprometen a hacer un uso responsable de la aplicación y a tratar con respeto a quienes prestan los servicios.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-ink text-base mb-1">6. Aceptación de los términos</h2>
            <p>
              El uso de esta aplicación web implica la aceptación de estos términos y condiciones. Nos reservamos el derecho de actualizar o modificar este aviso en cualquier momento para mejorar el funcionamiento de la plataforma.
            </p>
          </div>
        </div>

        {/* Botón inferior de retorno */}
        <div className="border-t border-stone pt-6 text-center">
          <button
            onClick={() => navigate("/buscar")}
            className="rounded-sm bg-taller px-6 py-2.5 font-medium text-paper hover:opacity-90 cursor-pointer text-xs uppercase tracking-wider"
          >
            Volver a la pantalla de búsqueda
          </button>
        </div>
      </div>
    </div>
  );
}