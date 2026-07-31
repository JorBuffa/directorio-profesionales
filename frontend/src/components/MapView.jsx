import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconoCliente = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconoProfesional = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente auxiliar para ajustar automáticamente el zoom y encuadrar todos los pines visibles
function AjustarMapa({ profesionales, centroCliente }) {
  const map = useMap();

  useEffect(() => {
    const puntos = [];

    // Agregar la ubicación del cliente si existe
    if (centroCliente && centroCliente.lat && centroCliente.lng) {
      puntos.push([centroCliente.lat, centroCliente.lng]);
    }

    // Agregar las ubicaciones de todos los profesionales filtrados
    profesionales.forEach((p) => {
      const lat = p.latFinal || p.lat || p.latitud;
      const lng = p.lngFinal || p.lng || p.longitud;
      if (lat && lng) {
        puntos.push([parseFloat(lat), parseFloat(lng)]);
      }
    });

    // Si hay puntos para mostrar, ajustamos los límites del mapa automáticamente
    if (puntos.length > 0) {
      const bounds = L.latLngBounds(puntos);
      map.fitBounds(bounds, {
        padding: [50, 50], // Margen en píxeles para que los pines no queden pegados al borde
        maxZoom: 15        // Evita que haga un zoom excesivo si hay un solo profesional muy cerca
      });
    }
  }, [profesionales, centroCliente, map]);

  return null;
}

export default function MapView({ profesionales = [], centroCliente = null }) {
  const defaultCenter = centroCliente ? [centroCliente.lat, centroCliente.lng] : [-31.2333, -64.3167];

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={14} 
      style={{ height: '100%', width: '100%' }}
      key={centroCliente ? `${centroCliente.lat}-${centroCliente.lng}` : 'default'}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Componente dinámico que ajusta el encuadre de los pines */}
      <AjustarMapa profesionales={profesionales} centroCliente={centroCliente} />

      {centroCliente && (
        <Marker position={[centroCliente.lat, centroCliente.lng]} icon={iconoCliente}>
          <Popup>
            <div className="p-1">
              <p className="font-bold text-ink">📍 Tu ubicación actual</p>
            </div>
          </Popup>
        </Marker>
      )}

      {profesionales.map((p) => {
        const lat = p.latFinal || p.lat || p.latitud;
        const lng = p.lngFinal || p.lng || p.longitud;

        if (!lat || !lng) return null;

        const telWp = p.whatsapp || p.telefono || "";
        const nombreProf = p.nombre_completo || p.nombre || "Profesional";
        const mensajeWp = encodeURIComponent(`Hola ${nombreProf}, te contacto desde ConectaOficios. Necesito tus servicios.`);
        const linkWhatsapp = telWp ? `https://wa.me/${telWp.replace(/\D/g, '')}?text=${mensajeWp}` : "#";

        return (
          <Marker key={p.id} position={[parseFloat(lat), parseFloat(lng)]} icon={iconoProfesional}>
            <Popup>
              <div className="p-1 font-sans min-w-[180px]">
                <p className="font-bold text-ink text-base">{nombreProf}</p>
                <p className="text-xs text-ink/70 mt-0.5 uppercase">{p.direccion || p.localidad || "Unquillo"}</p>
                
                <p className="mt-1 text-xs font-bold text-copper">
                  {p.distanciaKm !== undefined ? `${p.distanciaKm.toFixed(1)} km de distancia` : ""}
                </p>

                {telWp ? (
                  <a
                    href={linkWhatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center w-full rounded-sm bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 transition cursor-pointer"
                  >
                    💬 Contactar por WhatsApp
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-red-500 italic">Sin WhatsApp registrado</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}