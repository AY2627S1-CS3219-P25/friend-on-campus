/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-10-17
 * Scope: Interactive React Leaflet map (OpenStreetMap tiles) for the Post Errand pickup-spot picker. Drops a
 * pin for every supplier with coordinates; clicking a pin selects that supplier and closes the map, same as
 * picking it from the existing dropdown. The view auto-fits to whichever suppliers are passed in instead of a
 * hardcoded zoom level.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Hovering a pin shows a tooltip above it with the store's name, its operating hours and "Closed now" when
 * it is outside them (author's request of 2026-11-04).
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by jagdeepsh)
import type { SupplierDTO } from '@campus-errand/common-dtos';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { MapPin, X } from 'lucide-react';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';

// Leaflet's default marker icon paths are relative to a server document root and break under a bundler
// (Vite fingerprints the image filenames) unless re-pointed at the bundled asset URLs explicitly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// NUS Kent Ridge campus centre — used only if no supplier has usable coordinates to fit to.
const NUS_FALLBACK_CENTER: [number, number] = [1.2966, 103.7764];
const NUS_FALLBACK_ZOOM = 16;

interface SupplierPickupMapProps {
  suppliers: SupplierDTO[];
  selectedSupplierId: string;
  onSelect: (supplier: SupplierDTO) => void;
  onClose: () => void;
}

type GeoSupplier = SupplierDTO & { latitude: number; longitude: number };

function hasCoordinates(s: SupplierDTO): s is GeoSupplier {
  return typeof s.latitude === 'number' && typeof s.longitude === 'number'
    && Number.isFinite(s.latitude) && Number.isFinite(s.longitude);
}

// Fits the map's view to every pin so all suppliers are visible on open, instead of a fixed zoom that might
// crop some out or leave the map mostly empty.
function FitBoundsToMarkers({ suppliers }: { suppliers: GeoSupplier[] }) {
  const map = useMap();

  useEffect(() => {
    if (suppliers.length === 0) {
      map.setView(NUS_FALLBACK_CENTER, NUS_FALLBACK_ZOOM);
      return;
    }
    if (suppliers.length === 1) {
      map.setView([suppliers[0].latitude, suppliers[0].longitude], NUS_FALLBACK_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(suppliers.map((s) => [s.latitude, s.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, suppliers]);

  return null;
}

export function SupplierPickupMap({ suppliers, selectedSupplierId, onSelect, onClose }: SupplierPickupMapProps) {
  const geoSuppliers = suppliers.filter(hasCoordinates);

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-nus-blue" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Pick a Spot on the Map</h3>
              <p className="text-xs text-slate-500">Tap a pin to select that pickup spot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-square-button p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Close map"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-[60vh] min-h-[320px]">
          {geoSuppliers.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500 p-6 text-center">
              None of the available pickup spots have map coordinates yet.
            </div>
          ) : (
            <MapContainer center={NUS_FALLBACK_CENTER} zoom={NUS_FALLBACK_ZOOM} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBoundsToMarkers suppliers={geoSuppliers} />
              {geoSuppliers.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.latitude, s.longitude]}
                  eventHandlers={{ click: () => { onSelect(s); onClose(); } }}
                >
                  {/* The default icon's tooltipAnchor is [16, -28]; this offset centres the label just above the pin. */}
                  <Tooltip direction="top" offset={[-16, -14]}>
                    <span className="block font-semibold text-slate-900">{s.name}</span>
                    {formatOperatingHours(s) && (
                      <span className="block text-slate-500">
                        {formatOperatingHours(s)}
                        {isOpenAt(s, new Date()) === false && (
                          <span className="text-rose-600 font-semibold"> &middot; Closed now</span>
                        )}
                      </span>
                    )}
                  </Tooltip>
                  <Popup>
                    <div className="text-sm space-y-0.5">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-slate-500">{s.campusZone} &middot; {s.category}</p>
                      {s.id === selectedSupplierId && (
                        <p className="text-nus-blue font-semibold text-xs mt-1">Currently selected</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
