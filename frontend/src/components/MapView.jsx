import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
        // Tomamos latFinal / lngFinal prioritariamente
        const lat = p.latFinal || p.lat || p.latitud;
        const lng = p.lngFinal || p.lng || p.longitud;

        if (!lat || !lng) return null;

        return (
          <Marker key={p.id} position={[parseFloat(lat), parseFloat(lng)]} icon={iconoProfesional}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-ink">{p.nombre_completo || p.nombre}</p>
                <p className="text-xs text-ink/70">{p.direccion || p.localidad || "Unquillo"}</p>
                <p className="mt-1 text-xs font-bold text-copper">
                  {p.distanciaKm !== undefined ? `${p.distanciaKm.toFixed(1)} km de distancia` : ""}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}