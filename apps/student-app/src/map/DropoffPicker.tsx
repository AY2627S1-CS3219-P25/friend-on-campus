/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent; Claude Code (model: Claude Opus 5.5), date: 2026-11-04 to 2026-11-07
 * Scope: Author's follow-up on UI consistency: the picker is a regular Post form field (bold icon label with a pill, rounded-xl input, map icon button beside it as..; updated across 6 AI-assisted revisions through D4 wrap-up (simplify the optional building-pin label to complement the posting page disclosure).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import L from 'leaflet';
import { Building2, Map as MapIcon, MapPin, Navigation, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from './creditEstimate';
import { NUS_FALLBACK_CENTER, NUS_FALLBACK_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL, dropoffIcon } from './leafletSetup';
import { NUS_BUILDINGS, searchBuildings, type NusBuilding } from './nusBuildings';

export interface DropoffPoint extends LatLng {
  /** The building's name, or null for a point clicked on the map. */
  buildingName: string | null;
}

interface DropoffPickerProps {
  value: DropoffPoint | null;
  onChange: (point: DropoffPoint | null) => void;
  /** The selected pickup store's coordinates, shown on the map for reference. */
  pickup: LatLng | null;
  pickupName?: string;
}

export function formatCoordinates(point: LatLng): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export function DropoffPicker({ value, onChange, pickup, pickupName }: DropoffPickerProps) {
  const [query, setQuery] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const listId = useId();
  const inputId = useId();
  const results = useMemo(() => searchBuildings(NUS_BUILDINGS, query), [query]);

  const chooseBuilding = (building: NusBuilding) => {
    onChange({ latitude: building.latitude, longitude: building.longitude, buildingName: building.name });
    setQuery('');
  };

  // Same field pattern as the rest of the Post form: bold icon label, rounded-xl input with the map button beside it
  // (as on Pickup Store), grey helper line underneath.
  const mapButton = (
    <button
      type="button"
      onClick={() => setIsMapOpen(true)}
      title={value ? 'Move the pin on the map' : 'Not listed? Pick on map'}
      aria-label={value ? 'Move the pin on the map' : 'Not listed? Pick on map'}
      className="shrink-0 px-3 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-campus-blue flex items-center justify-center transition"
    >
      <MapIcon className="w-4 h-4" />
    </button>
  );

  return (
    <div data-testid="dropoff-picker">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={inputId} className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-orange-700" />
          <span>Building or map point</span>
        </label>
        <span className="text-xs text-campus-blue font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          Suggests a reward
        </span>
      </div>

      {value ? (
        <div className="flex items-stretch gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 text-sm p-3 rounded-xl border border-slate-300 bg-white">
            {value.buildingName ? (
              <Building2 className="w-4 h-4 text-orange-700 shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-orange-700 shrink-0" />
            )}
            <span className="font-semibold text-slate-800 truncate">{value.buildingName ?? 'Point on map'}</span>
            <span className="ml-auto shrink-0 text-xs font-mono text-slate-500 hidden sm:inline">
              {formatCoordinates(value)}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Clear drop-off point"
              className="shrink-0 p-1 -my-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {mapButton}
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              id={inputId}
              type="search"
              role="combobox"
              aria-label="Search NUS buildings"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              placeholder="Search a building, e.g. COM3, Central Library"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter must not submit the errand form; it picks the top match instead.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (results[0]) chooseBuilding(results[0]);
                }
                if (e.key === 'Escape') setQuery('');
              }}
              className="w-full text-base sm:text-sm p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            {results.length > 0 && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Matching buildings"
                className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1"
              >
                {results.map((building) => (
                  <li key={building.elementId} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => chooseBuilding(building)}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 focus-visible:bg-slate-100 outline-none"
                    >
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{building.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mapButton}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-1">
        {query.trim() && results.length === 0 && !value
          ? <>No listed building matches &ldquo;{query.trim()}&rdquo;. Use the map button to drop a pin instead.</>
          : 'Pick the building, or use the map button if it isn\'t listed. This only sets the pin; the address above is still required.'}
      </p>

      {isMapOpen && (
        <DropoffPickMap
          initial={value}
          pickup={pickup}
          pickupName={pickupName}
          onConfirm={(point) => {
            onChange(point);
            setIsMapOpen(false);
          }}
          onClose={() => setIsMapOpen(false)}
        />
      )}
    </div>
  );
}

function ClickToPlace({ onPlace }: { onPlace: (point: LatLng) => void }) {
  useMapEvents({
    click(event: L.LeafletMouseEvent) {
      onPlace({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

// Fit once when the map opens, so the pickup and an existing drop-off are both on screen; later clicks don't refit.
function FitOnOpen({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], NUS_FALLBACK_ZOOM);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])), {
      padding: [50, 50],
      maxZoom: 17,
    });
  }, [map, points]);
  return null;
}

interface DropoffPickMapProps {
  initial: DropoffPoint | null;
  pickup: LatLng | null;
  pickupName?: string;
  onConfirm: (point: DropoffPoint) => void;
  onClose: () => void;
}

function DropoffPickMap({ initial, pickup, pickupName, onConfirm, onClose }: DropoffPickMapProps) {
  const [pin, setPin] = useState<DropoffPoint | null>(initial);
  // Captured once, for the opening view.
  const [openPoints] = useState(() => [pickup, initial].filter((point): point is LatLng => point !== null));

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pick a drop-off point"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-orange-700" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Pick a Drop-off Point</h3>
              <p className="text-xs text-slate-500">Tap the map to place the pin; tap again to move it</p>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-campus-blue" /> Pickup
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-campus-coral border border-white shadow" /> Drop-off
                </span>
              </p>
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

        <div className="h-[55vh] min-h-[300px]">
          <MapContainer center={NUS_FALLBACK_CENTER} zoom={NUS_FALLBACK_ZOOM} className="h-full w-full">
            <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
            <FitOnOpen points={openPoints} />
            <ClickToPlace onPlace={(point) => setPin({ ...point, buildingName: null })} />
            {pickup && (
              <Marker position={[pickup.latitude, pickup.longitude]} alt={pickupName ?? 'Pickup spot'}>
                <Tooltip permanent direction="top" offset={[-16, -14]}>Pickup: {pickupName ?? 'selected spot'}</Tooltip>
              </Marker>
            )}
            {pin && (
              <Marker position={[pin.latitude, pin.longitude]} icon={dropoffIcon} alt="Drop-off point">
                <Tooltip permanent direction="top" offset={[0, -10]}>Drop-off{pin.buildingName ? `: ${pin.buildingName}` : ''}</Tooltip>
              </Marker>
            )}
          </MapContainer>
        </div>
        {!pickup && (
          <p className="px-4 pt-3 text-xs text-slate-500">
            Select a pickup store with a map location to see it here and get a suggested reward.
          </p>
        )}

        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500 font-mono">{pin ? formatCoordinates(pin) : 'No point chosen yet'}</span>
          <button
            type="button"
            disabled={!pin}
            onClick={() => pin && onConfirm(pin)}
            className="px-4 py-2.5 rounded-xl bg-campus-blue hover:bg-campus-blue-hover text-white text-sm font-semibold shadow-subtle transition disabled:bg-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Use this point
          </button>
        </div>
      </div>
    </div>
  );
}
