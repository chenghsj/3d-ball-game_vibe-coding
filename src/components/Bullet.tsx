import React, { useRef } from "react";
import { Vector3, Mesh } from "three";
import { useFrame } from "@react-three/fiber";

interface BulletProps {
  position: Vector3;
}

const Bullet: React.FC<BulletProps> = ({ position }) => {
  const bulletRef = useRef<Mesh>(null);

  // Add visual effects for bullet lifetime
  useFrame(() => {
    if (bulletRef.current) {
      // Rotate bullet for visual interest
      bulletRef.current.rotation.x += 0.2;
      bulletRef.current.rotation.y += 0.2;
    }
  });

  return (
    <mesh ref={bulletRef} position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color="#00ffff" // Bright cyan
        emissive="#40ffff" // Even brighter cyan for glow
        emissiveIntensity={1.5} // Increased to compensate for no reflection
        metalness={0} // No metalness/reflection
        roughness={1} // Maximum roughness for matte appearance
        transparent={true}
        opacity={0.9} // Slightly transparent for glow effect
      />
      {/* Add a point light to make the bullet illuminate surroundings */}
      <pointLight color="#80ffff" intensity={2.0} distance={3} decay={2} />
    </mesh>
  );
};

export default Bullet;
