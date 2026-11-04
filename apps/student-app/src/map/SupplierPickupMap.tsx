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
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-01
 * Scope: Group coincident markers and let users select a named supplier in the popup.
 * Author review: <to be completed by Reallyeasy1>
 */

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { MapPin, X } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';
import type { SupplierDTO } from '@campus-errand/common-dtos';
import { groupSuppliersByLocation, type SupplierLocation } from './supplierLocations';

// Use bundled icons so Vite's fingerprinted asset paths resolve correctly.
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

// AI-generated (edited by Reallyeasy1)
function FitBoundsToMarkers({ locations }: { locations: SupplierLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView(NUS_FALLBACK_CENTER, NUS_FALLBACK_ZOOM);
      return;
    }
    if (locations.length === 1) {
      map.setView(locations[0].position, NUS_FALLBACK_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(locations.map((location) => location.position));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, locations]);

  return null;
}

export function SupplierPickupMap({ suppliers, selectedSupplierId, onSelect, onClose }: SupplierPickupMapProps) {
  const locations = useMemo(() => groupSuppliersByLocation(suppliers), [suppliers]);

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-nus-blue" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Pick a Spot on the Map</h3>
              <p className="text-xs text-slate-500">Tap a pin, then choose your pickup spot</p>
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
          {locations.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500 p-6 text-center">
              None of the available pickup spots have map coordinates yet.
            </div>
          ) : (
            <MapContainer center={NUS_FALLBACK_CENTER} zoom={NUS_FALLBACK_ZOOM} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBoundsToMarkers locations={locations} />
              {locations.map((location) => (
                <Marker
                  key={location.key}
                  position={location.position}
                  alt={location.suppliers.map((supplier) => supplier.name).join(', ')}
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
                    <div className="min-w-[200px] max-h-60 overflow-y-auto space-y-2">
                      {location.suppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nus-blue"
                          aria-pressed={supplier.id === selectedSupplierId}
                          onClick={() => { onSelect(supplier); onClose(); }}
                        >
                          <span className="block font-bold text-slate-900">{supplier.name}</span>
                          <span className="block text-slate-500">{supplier.campusZone} &middot; {supplier.category}</span>
                          {supplier.id === selectedSupplierId && (
                            <span className="block text-nus-blue font-semibold text-xs mt-1">Currently selected</span>
                          )}
                        </button>
                      ))}
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
