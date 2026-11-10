/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Claude Code (model: Sonnet 5, Claude Opus 5.5), date: 2026-10-17 to 2026-11-07
 * Scope: Interactive React Leaflet map (OpenStreetMap tiles) for the Post Errand pickup-spot picker; updated across 6 AI-assisted revisions through D4 wrap-up (align map controls and drop-off marker styling with the shared blue/coral palette without changing map selection behaviour).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapPin, X } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useMinuteClock } from '../suppliers/minuteClock';
import { formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';
import type { SupplierDTO } from '@campus-errand/common-dtos';
import { NUS_FALLBACK_CENTER, NUS_FALLBACK_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL } from './leafletSetup';
import { groupSuppliersByLocation, type SupplierLocation } from './supplierLocations';

interface SupplierPickupMapProps {
  suppliers: SupplierDTO[];
  selectedSupplierId: string;
  onSelect: (supplier: SupplierDTO) => void;
  onClose: () => void;
}

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
  const now = useMinuteClock();

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-campus-blue" />
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
              <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
              <FitBoundsToMarkers locations={locations} />
              {locations.map((location) => (
                <Marker
                  key={location.key}
                  position={location.position}
                  alt={location.suppliers.map((supplier) => supplier.name).join(', ')}
                >
                  {/* The default icon's tooltipAnchor is [16, -28]; this offset centres the label just above the pin. */}
                  <Tooltip direction="top" offset={[-16, -14]}>
                    {location.suppliers.map((supplier) => {
                      const hours = formatOperatingHours(supplier);
                      return (
                        <span key={supplier.id} className="block">
                          <span className="block font-semibold text-slate-900">{supplier.name}</span>
                          {hours && (
                            <span className="block text-slate-500">
                              {hours}
                              {isOpenAt(supplier, now) === false && (
                                <span className="text-rose-600 font-semibold"> &middot; Closed now</span>
                              )}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </Tooltip>
                  <Popup>
                    <div className="min-w-[200px] max-h-60 overflow-y-auto space-y-2">
                      {location.suppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                          aria-pressed={supplier.id === selectedSupplierId}
                          onClick={() => { onSelect(supplier); onClose(); }}
                        >
                          <span className="block font-bold text-slate-900">{supplier.name}</span>
                          <span className="block text-slate-500">{supplier.campusZone} &middot; {supplier.category}</span>
                          {supplier.id === selectedSupplierId && (
                            <span className="block text-campus-blue font-semibold text-xs mt-1">Currently selected</span>
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
