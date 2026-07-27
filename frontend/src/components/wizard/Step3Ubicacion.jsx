import { useState } from "react";

export default function Step3Ubicacion({ datos, onChange, onNext, onBack }) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  const valido = datos.lat && datos.lng;

  async function geocodificar() {
    if (!datos.direccion) return;
    setBuscando(true);
    setError("");
    try {
      // Nominatim (OpenStreetMap) para convertir la dirección escrita en
      // coordenadas. En producción, considerar un proveedor con SLA
      // (Google Geocoding, Mapbox) y cachear resultados.
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        datos.direccion
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (data.length === 0) {
        setError("No pudimos ubicar esa dirección. Probá con más detalle (calle, número, ciudad).");
        return;
      }
      onChange({ lat: data[0].lat, lng: data[0].lon });
    } catch {
      setError("No pudimos consultar el servicio de mapas. Probá de nuevo en unos segundos.");
    } finally {
      setBuscando(false);
    }
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, direccion: datos.direccion }),
      () => setError("No pudimos acceder a tu ubicación. Escribí tu dirección manualmente.")
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-ink">Dirección de referencia</span>
        <div className="mt-1 flex gap-2">
          <input
            value={datos.direccion}
            onChange={(e) => onChange({ direccion: e.target.value, lat: "", lng: "" })}
            placeholder="Calle, número, barrio, ciudad"
            className="w-full rounded-sm border border-stone px-3 py-2 focus:border-copper"
          />
          <button
            onClick={geocodificar}
            disabled={buscando}
            className="whitespace-nowrap rounded-sm border border-stone px-4 py-2 text-sm font-medium hover:border-copper disabled:opacity-50"
          >
            {buscando ? "Buscando…" : "Ubicar"}
          </button>
        </div>
      </label>

      <button onClick={usarMiUbicacion} className="text-sm font-medium text-taller hover:underline">
        Usar mi ubicación actual
      </button>

      {error && <p className="text-sm text-copper-dark">{error}</p>}

      {valido && (
        <p className="font-mono text-xs text-ink/50">
          Coordenadas: {Number(datos.lat).toFixed(5)}, {Number(datos.lng).toFixed(5)}
        </p>
      )}

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
