import React from "react";
import { Globe3D } from "./ui/3d-globe";

const sampleMarkers = [
  { lat: 28.6139, lng: 77.209, label: "Amazon India" },
  { lat: 19.076, lng: 72.8777, label: "Flipkart Hub" },
  { lat: 40.7128, lng: -74.006, label: "BestBuy US" },
  { lat: 51.5074, lng: -0.1278, label: "UK Stores" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo Deals" },
  { lat: 25.2048, lng: 55.2708, label: "Dubai Mall" },
];

export function Globe3DDemo() {
  return (
    <Globe3D
      markers={sampleMarkers}
      config={{
        atmosphereColor: "#38bdf8",
        autoRotateSpeed: 0.4,
        showAtmosphere: true,
      }}
    />
  );
}