"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { UGANDA_BOUNDS, UGANDA_CENTER } from "@/lib/geo";

const pinIcon = L.divIcon({
  className: "",
  iconSize: [40, 48],
  iconAnchor: [20, 46],
  html: '<svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg"><path d="M20 46C20 46 4 30 4 18a16 16 0 0 1 32 0c0 12-16 28-16 28z" fill="#123a21" stroke="#ffffff" stroke-width="2.5"/><circle cx="20" cy="18" r="6.5" fill="#f2c230"/></svg>',
});

interface MapPickerProps {
  position: [number, number] | null;
  flyTo: [number, number] | null;
  onPick: (latitude: number, longitude: number) => void;
}

function ClickHandler({ onPick }: { onPick: MapPickerProps["onPick"] }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 13, { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function MapPicker({ position, flyTo, onPick }: MapPickerProps) {
  const bounds: [[number, number], [number, number]] = [
    [UGANDA_BOUNDS.south - 1, UGANDA_BOUNDS.west - 1],
    [UGANDA_BOUNDS.north + 1, UGANDA_BOUNDS.east + 1],
  ];

  return (
    <MapContainer
      center={position ?? UGANDA_CENTER}
      zoom={position ? 12 : 7}
      minZoom={6}
      maxBounds={bounds}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {position ? (
        <Marker
          position={position}
          icon={pinIcon}
          draggable
          keyboard={false}
          eventHandlers={{
            dragend(event) {
              const point = (event.target as L.Marker).getLatLng();
              onPick(point.lat, point.lng);
            },
          }}
        />
      ) : null}
      <ClickHandler onPick={onPick} />
      <FlyTo target={flyTo} />
    </MapContainer>
  );
}
