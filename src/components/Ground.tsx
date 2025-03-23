import React, { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";

const Ground: React.FC = () => {
  const { viewport } = useThree();
  const materialRef = useRef<MeshStandardMaterial>(null);

  // Use fixed width of 8 units (in Three.js units)
  const width = 8;
  const depth = Math.max(50, viewport.height * 2);

  // Add subtle color pulsing effect
  useFrame((state) => {
    if (materialRef.current) {
      // Subtle color shift over time for more vibrant appearance
      const t = state.clock.getElapsedTime() * 0.2;
      const hue = Math.sin(t) * 0.05 + 0.65; // Subtle hue shift in blue range
      materialRef.current.color.setHSL(hue, 0.6, 0.2); // More saturated
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#223366" // Brighter blue-ish base color
        metalness={0} // No reflection
        roughness={1} // Maximum roughness for matte appearance
        emissive="#112244"
        emissiveIntensity={0.3} // Increased to compensate for no reflection
        flatShading={true} // Add flat shading for less reflective appearance
      />
    </mesh>
  );
};

export default Ground;
