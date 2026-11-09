/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Read-only mini map on the errand page: the stored drop-off pin and, when the supplier has coordinates, the
 * pickup pin, with the view fitted to both.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Author's follow-up: both pins carry a permanent "Pickup: <store>" / "Drop-off" label.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLng } from './creditEstimate';
import { NUS_FALLBACK_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL, dropoffIcon } from './leafletSetup';

interface ErrandRouteMapProps {
  dropoff: LatLng;
  pickup: LatLng | null;
  pickupName?: string;
}

function FitRoute({ dropoff, pickup }: { dropoff: LatLng; pickup: LatLng | null }) {
  const map = useMap();
  const { latitude: dropoffLat, longitude: dropoffLng } = dropoff;
  const pickupLat = pickup?.latitude;
  const pickupLng = pickup?.longitude;
  useEffect(() => {
    if (pickupLat === undefined || pickupLng === undefined) {
      map.setView([dropoffLat, dropoffLng], NUS_FALLBACK_ZOOM);
      return;
    }
    map.fitBounds(
      L.latLngBounds([[dropoffLat, dropoffLng], [pickupLat, pickupLng]]),
      { padding: [40, 40], maxZoom: 17 },
    );
  }, [map, dropoffLat, dropoffLng, pickupLat, pickupLng]);
  return null;
}

export function ErrandRouteMap({ dropoff, pickup, pickupName }: ErrandRouteMapProps) {
  return (
    <MapContainer
      center={[dropoff.latitude, dropoff.longitude]}
      zoom={NUS_FALLBACK_ZOOM}
      scrollWheelZoom={false}
      className="h-48 w-full rounded-xl border border-slate-100 z-0"
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      <FitRoute dropoff={dropoff} pickup={pickup} />
      {pickup && (
        <Marker position={[pickup.latitude, pickup.longitude]} alt={pickupName ?? 'Pickup spot'}>
          <Tooltip permanent direction="top" offset={[-16, -14]}>Pickup: {pickupName ?? 'pickup spot'}</Tooltip>
        </Marker>
      )}
      <Marker position={[dropoff.latitude, dropoff.longitude]} icon={dropoffIcon} alt="Drop-off point">
        <Tooltip permanent direction="top" offset={[0, -10]}>Drop-off</Tooltip>
      </Marker>
    </MapContainer>
  );
}
