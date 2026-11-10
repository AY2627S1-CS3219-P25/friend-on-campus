/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Claude Code (model: Claude Opus 5.5), date: 2026-11-04 to 2026-11-07
 * Scope: Moved the bundled marker icon fix out of SupplierPickupMap so the drop-off maps share it; updated across 2 AI-assisted revisions through D4 wrap-up (align map controls and drop-off marker styling with the shared blue/coral palette without changing map selection behaviour).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

// Use bundled icons so Vite's fingerprinted asset paths resolve correctly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// NUS Kent Ridge campus centre — used only when there is nothing to fit the view to.
export const NUS_FALLBACK_CENTER: [number, number] = [1.2966, 103.7764];
export const NUS_FALLBACK_ZOOM = 16;

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** A drop-off pin coloured apart from the default (pickup) marker. */
export const dropoffIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#ff8057;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35),0 1px 4px rgba(0,0,0,.4)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
