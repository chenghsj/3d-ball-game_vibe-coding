import React, { useRef, useState } from "react";
import { Vector3, Mesh } from "three";
import { useStore } from "../store";
import { useFrame } from "@react-three/fiber";

interface ObstacleProps {
  position: Vector3;
  scale?: number;
  rotationSpeed?: number;
}

const Obstacle: React.FC<ObstacleProps> = ({ position, scale = 1.0, rotationSpeed = 0.2 }) => {
  const level = useStore((state) => state.level);
  const obstacleRef = useRef<Mesh>(null);

  // Use unique rotation direction for each obstacle
  const [rotationDirection] = useState({
    x: Math.random() > 0.5 ? 1 : -1,
    y: Math.random() > 0.5 ? 1 : -1,
    z: Math.random() > 0.5 ? 1 : -1,
  });

  // Randomize obstacle appearance
  const [obstacleType] = useState(Math.floor(Math.random() * 3));

  // Add rotation animation with custom speed and direction
  useFrame((_state, delta) => {
    if (obstacleRef.current) {
      const speedFactor = level > 6 ? 1.5 : 1.0;
      obstacleRef.current.rotation.x += delta * rotationDirection.x * rotationSpeed * speedFactor;
      obstacleRef.current.rotation.y += delta * rotationDirection.y * rotationSpeed * speedFactor;

      // Add some additional motion for higher levels
      if (level > 8) {
        obstacleRef.current.rotation.z += delta * rotationDirection.z * rotationSpeed * 0.5;
      }
    }
  });

  // Get different colors based on level and randomness - brighter colors
  const getObstacleColor = () => {
    const colors = [
      "#ff3333", // Bright red
      "#ff6600", // Bright orange
      "#ff0066", // Hot pink
      "#ff3399", // Bright pink
      "#ff00cc", // Vibrant magenta
      "#cc00ff", // Bright purple
      "#6600ff", // Bright violet
    ];

    // Choose color based on level and obstacle type
    const baseIndex = Math.min(Math.floor(level / 2), colors.length - 3);
    return colors[baseIndex + (obstacleType % 3)];
  };

  return (
    <mesh ref={obstacleRef} position={position} scale={scale}>
      {obstacleType === 0 ? (
        <boxGeometry args={[1, 0.8, 1]} />
      ) : obstacleType === 1 ? (
        <octahedronGeometry args={[0.6]} />
      ) : (
        <dodecahedronGeometry args={[0.6]} />
      )}
      <meshStandardMaterial
        color={getObstacleColor()}
        emissive={getObstacleColor()} // Always emit light
        emissiveIntensity={0.6 + level * 0.05} // Stronger emission to compensate for no reflection
        metalness={0} // No metalness/reflection
        roughness={1} // Maximum roughness for matte appearance
      />
    </mesh>
  );
};

export default Obstacle;
