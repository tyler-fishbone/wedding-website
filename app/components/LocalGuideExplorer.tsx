"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { guidePlaces, type GuidePlace } from "../content/wedding";

type MapLike = { panTo: (position: { lat: number; lng: number }) => void; setZoom: (zoom: number) => void };
type MarkerLike = { setMap: (map: MapLike | null) => void; setIcon: (icon: Record<string, string>) => void; setZIndex: (zIndex: number) => void; addListener: (event: string, listener: () => void) => void };
type InfoWindowLike = { setContent: (content: string) => void; open: (options: { map: MapLike; anchor: MarkerLike }) => void; close: () => void };
type MapsApi = { maps: { Map: new (element: HTMLElement, options: Record<string, unknown>) => MapLike; Marker: new (options: Record<string, unknown>) => MarkerLike; InfoWindow: new () => InfoWindowLike } };

declare global {
  interface Window { google?: MapsApi }
}

const categories = ["All", "Eat & drink", "Things to do", "Live music"] as const;
type Category = (typeof categories)[number];
const mapCenter = { lat: 30.2672, lng: -97.7431 };

function markerIcon(isSelected: boolean) {
  const fill = isSelected ? "#d9ac28" : "#0075a5";
  const stroke = isSelected ? "#111111" : "#fefbf7";
  const size = isSelected ? 44 : 32;
  const radius = isSelected ? 15 : 11;
  const center = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="M${center} 2C${center - radius} 2 ${center - radius - 2} ${radius + 2} ${center} ${size - 2}C${center + radius + 2} ${radius + 2} ${center + radius} 2 ${center} 2Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="${center}" cy="${radius + 2}" r="4" fill="#fefbf7"/></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function loadGoogleMaps(apiKey: string): Promise<MapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script") as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => window.google?.maps ? resolve(window.google) : reject(new Error("Google Maps did not load.")), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.maps ? resolve(window.google) : reject(new Error("Google Maps did not load."));
    script.onerror = () => reject(new Error("Google Maps could not load."));
    document.head.appendChild(script);
  });
}

export function LocalGuideExplorer() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const markersRef = useRef<MarkerLike[]>([]);
  const markersByPlaceRef = useRef<Record<string, MarkerLike>>({});
  const infoWindowRef = useRef<InfoWindowLike | null>(null);
  const placeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedPlaceId, setSelectedPlaceId] = useState(guidePlaces[0]?.id ?? "");
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "missing-key" | "error">("loading");

  const visiblePlaces = useMemo(() => activeCategory === "All" ? guidePlaces : guidePlaces.filter((place) => place.category === activeCategory), [activeCategory]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0];

  useEffect(() => {
    if (!visiblePlaces.some((place) => place.id === selectedPlaceId)) setSelectedPlaceId(visiblePlaces[0]?.id ?? "");
  }, [selectedPlaceId, visiblePlaces]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapElementRef.current) { setMapStatus("missing-key"); return; }

    let cancelled = false;
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !mapElementRef.current || mapRef.current) return;
      mapRef.current = new maps.maps.Map(mapElementRef.current, { center: mapCenter, zoom: 12, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: true });
      setMapStatus("ready");
    }).catch(() => { if (!cancelled) setMapStatus("error"); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google;
    if (!map || !maps?.maps) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    infoWindowRef.current?.close();
    infoWindowRef.current = new maps.maps.InfoWindow();
    markersByPlaceRef.current = {};
    markersRef.current = visiblePlaces.map((place) => {
      const marker = new maps.maps.Marker({ map, position: { lat: place.lat, lng: place.lng }, title: place.title, icon: markerIcon(place.id === selectedPlaceId), zIndex: place.id === selectedPlaceId ? 2 : 1 });
      markersByPlaceRef.current[place.id] = marker;
      marker.addListener("click", () => {
        setSelectedPlaceId(place.id);
        Object.entries(markersByPlaceRef.current).forEach(([placeId, placeMarker]) => {
          const isSelected = placeId === place.id;
          placeMarker.setIcon(markerIcon(isSelected));
          placeMarker.setZIndex(isSelected ? 2 : 1);
        });
        infoWindowRef.current?.setContent(`<div class="guide-map-popup"><strong>${escapeHtml(place.title)}</strong><span>${escapeHtml(place.subtitle)}</span><a href="${place.mapHref}" target="_blank" rel="noreferrer">Open in Google Maps ↗</a></div>`);
        infoWindowRef.current?.open({ map, anchor: marker });
      });
      return marker;
    });
  }, [mapStatus, visiblePlaces]);

  useEffect(() => {
    if (!selectedPlace) return;
    placeButtonRefs.current[selectedPlace.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    Object.entries(markersByPlaceRef.current).forEach(([placeId, marker]) => {
      const isSelected = placeId === selectedPlace.id;
      marker.setIcon(markerIcon(isSelected));
      marker.setZIndex(isSelected ? 2 : 1);
    });
    mapRef.current?.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
    mapRef.current?.setZoom(14);
  }, [mapStatus, selectedPlace]);

  return <section className="guide-explorer" aria-label="Austin recommendations">
    <div className="guide-explorer__filters" role="group" aria-label="Filter recommendations">
      {categories.map((category) => <button className={activeCategory === category ? "guide-chip guide-chip--active" : "guide-chip"} key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category}>{category}</button>)}
    </div>
    <div className="guide-explorer__body">
      <div className="guide-explorer__list" aria-label="Recommendation list">
        {visiblePlaces.map((place) => <article className={selectedPlace?.id === place.id ? "guide-place guide-place--active" : "guide-place"} key={place.id}>
          <button className="guide-place__select" type="button" ref={(element) => { placeButtonRefs.current[place.id] = element; }} onClick={() => setSelectedPlaceId(place.id)}>
            <span className="guide-place__category">{place.category}</span>
            <span className="guide-place__title">{place.title}</span>
            <span className="guide-place__subtitle">{place.subtitle}</span>
            <span className="guide-place__body">{place.body}</span>
          </button>
          <a className="guide-place__map-link" href={place.mapHref} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
        </article>)}
      </div>
      <div className="guide-explorer__map-wrap">
        <div className="guide-explorer__map" ref={mapElementRef} aria-label="Map of Austin recommendations" />
        {mapStatus === "missing-key" && <div className="guide-explorer__map-status">Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to load the map.</div>}
        {mapStatus === "error" && <div className="guide-explorer__map-status">The map could not load. Please try again shortly.</div>}
        {mapStatus === "loading" && <div className="guide-explorer__map-status">Loading map…</div>}
      </div>
    </div>
  </section>;
}
