import React, { useRef, useMemo, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DEFAULT_EARTH_TEXTURE = "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg";
const DEFAULT_BUMP_TEXTURE = "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png";

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// Minimal Glowing Pin (No bulky text labels)
function Marker({ marker, radius }) {
  const [isVisible, setIsVisible] = useState(true);
  const groupRef = useRef(null);
  const { camera } = useThree();

  const surfacePosition = useMemo(() => {
    return latLngToVector3(marker.lat, marker.lng, radius * 1.002);
  }, [marker.lat, marker.lng, radius]);

  const topPosition = useMemo(() => {
    return latLngToVector3(marker.lat, marker.lng, radius * 1.06);
  }, [marker.lat, marker.lng, radius]);

  const lineHeight = topPosition.distanceTo(surfacePosition);

  useFrame(() => {
    if (!groupRef.current) return;
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);

    const markerDirection = worldPos.clone().normalize();
    const cameraDirection = camera.position.clone().normalize();
    const dot = markerDirection.dot(cameraDirection);

    setIsVisible(dot > 0.15);
  });

  const { lineCenter, lineQuaternion } = useMemo(() => {
    const center = surfacePosition.clone().lerp(topPosition, 0.5);
    const direction = topPosition.clone().sub(surfacePosition).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    return { lineCenter: center, lineQuaternion: quaternion };
  }, [surfacePosition, topPosition]);

  return (
    <group ref={groupRef} visible={isVisible}>
      {/* Subtle Pin Line */}
      <mesh position={lineCenter} quaternion={lineQuaternion}>
        <cylinderGeometry args={[0.002, 0.002, lineHeight, 8]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
      </mesh>

      {/* Surface Base Point */}
      <mesh position={surfacePosition} quaternion={lineQuaternion}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>

      {/* Floating Glowing Pulse Pin */}
      <mesh position={topPosition}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
    </group>
  );
}

function RotatingGlobe({ config, markers }) {
  const groupRef = useRef(null);

  const [earthTexture, bumpTexture] = useTexture([
    config.textureUrl,
    config.bumpMapUrl,
  ]);

  useMemo(() => {
    if (earthTexture) {
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      earthTexture.anisotropy = 16;
    }
    if (bumpTexture) {
      bumpTexture.anisotropy = 8;
    }
  }, [earthTexture, bumpTexture]);

  const geometry = useMemo(() => new THREE.SphereGeometry(config.radius, 64, 64), [config.radius]);

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          map={earthTexture}
          bumpMap={bumpTexture}
          bumpScale={config.bumpScale * 0.04}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {markers.map((marker, index) => (
        <Marker
          key={`marker-${index}-${marker.lat}-${marker.lng}`}
          marker={marker}
          radius={config.radius}
        />
      ))}
    </group>
  );
}

function Scene({ markers, config }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, config.radius * 3.3);
    camera.lookAt(0, 0, 0);
  }, [camera, config.radius]);

  return (
    <>
      {/* 
        Soft, balanced lighting:
        - Ambient light reduced from 2.0 -> 0.75 (White washout removed)
        - Soft sky-blue directional light for depth and real ocean colors
      */}
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[config.radius * 4, config.radius * 2, config.radius * 4]}
        intensity={1.1}
        color="#f8fafc"
      />
      <directionalLight
        position={[-config.radius * 3, config.radius, -config.radius * 2]}
        intensity={0.4}
        color="#38bdf8"
      />

      <RotatingGlobe config={config} markers={markers} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.3}
        autoRotate={config.autoRotateSpeed > 0}
        autoRotateSpeed={config.autoRotateSpeed}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

const defaultConfig = {
  radius: 2,
  textureUrl: DEFAULT_EARTH_TEXTURE,
  bumpMapUrl: DEFAULT_BUMP_TEXTURE,
  bumpScale: 1,
  autoRotateSpeed: 0.4,
};

export function Globe3D({ markers = [], config = {}, className }) {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [0, 0, mergedConfig.radius * 3.3],
        }}
      >
        <Suspense fallback={null}>
          <Scene markers={markers} config={mergedConfig} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Globe3D;