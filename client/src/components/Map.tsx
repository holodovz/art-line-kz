/// <reference types="@types/google.maps" />

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;
let mapScriptPromise: Promise<void> | null = null;

export type MapStatus = "loading" | "ready" | "error";

export function getMapsScriptUrl() {
  return `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
}

export function getGoogleEmbedUrl(center: google.maps.LatLngLiteral, zoom: number) {
  const params = new URLSearchParams({
    q: `${center.lat},${center.lng}`,
    z: String(zoom),
    output: "embed",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

function loadMapScript() {
  if (window.google?.maps) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;

  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error("Google Maps loading timed out"));
    }, 7000);

    script.src = getMapsScriptUrl();
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.google?.maps) resolve();
      else reject(new Error("Google Maps API did not initialise"));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  }).catch(error => {
    mapScriptPromise = null;
    throw error;
  });

  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  fallback?: ReactNode;
  onStatusChange?: (status: MapStatus) => void;
  staticFallback?: boolean;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  fallback,
  onStatusChange,
  staticFallback = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>("loading");

  useEffect(() => {
    let active = true;
    const updateStatus = (nextStatus: MapStatus) => {
      if (!active) return;
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
    };

    const init = async () => {
      if (staticFallback) {
        updateStatus("error");
        return;
      }
      try {
        updateStatus("loading");
        await loadMapScript();
        if (!active || !mapContainer.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(mapContainer.current, {
          zoom: initialZoom,
          center: initialCenter,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: false,
          mapId: "DEMO_MAP_ID",
        });
        onMapReady?.(map);
        updateStatus("ready");
      } catch (error) {
        console.warn("[MapView] Google Maps unavailable; fallback displayed.", error);
        updateStatus("error");
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [initialCenter, initialZoom, onMapReady, onStatusChange, staticFallback]);

  return (
    <div className={cn("relative h-[500px] w-full !opacity-100", className)}>
      {staticFallback ? (
        <>
          <iframe
            className="map-embed absolute inset-0 h-full w-full border-0"
            src={getGoogleEmbedUrl(initialCenter, initialZoom)}
            title="Google Maps"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {fallback && <div className="map-embed-plaque">{fallback}</div>}
        </>
      ) : (
        <>
          <div ref={mapContainer} className="absolute inset-0" aria-hidden={status !== "ready"} />
          {status === "loading" && <div className="map-status" aria-live="polite"><span /></div>}
          {status === "error" && <div className="map-fallback" role="status">{fallback}</div>}
        </>
      )}
    </div>
  );
}
