import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, Group, Mesh, MeshStandardMaterial } from "three";

interface DissolveEffectProps {
  position: Vector3;
  color: string;
  scale?: number;
  onComplete: () => void;
}

const DissolveEffect: React.FC<DissolveEffectProps> = ({
  position,
  color = "#ff3333",
  scale = 1.0,
  onComplete,
}) => {
  const groupRef = useRef<Group>(null);
  const cubes = useRef<
    Array<{
      position: Vector3;
      rotation: Vector3;
      rotationSpeed: Vector3;
      velocity: Vector3;
      size: number;
      life: number;
      maxLife: number;
    }>
  >([]);

  const lifespan = useRef(0.5); // How long the effect lasts in seconds
  const timeElapsed = useRef(0);
  const effectCompleted = useRef(false);

  // Initialize decomposing cubes
  useEffect(() => {
    const cubeCount = 15; // Use fewer but more visible cubes
    cubes.current = [];

    // Create cube arrangement in a grid-like pattern
    const gridSize = Math.ceil(Math.sqrt(cubeCount));
    const spacing = 0.15; // Spacing between cubes

    const effectScale = scale || 1.0;

    for (let i = 0; i < cubeCount; i++) {
      // Calculate positions in a grid pattern that will "explode" outward
      const col = i % gridSize;
      const row = Math.floor(i / gridSize);

      // Center the grid
      const offsetX = ((gridSize - 1) * spacing) / 2;
      const offsetY = ((gridSize - 1) * spacing) / 2;

      // Initial positions - tightly packed
      const x = col * spacing - offsetX;
      const y = row * spacing - offsetY;
      const z = 0;

      // Random explosion direction (more outward than before)
      const explosionDir = new Vector3(x, y, z).normalize();
      const speed = 0.1 + Math.random() * 0.2;

      // Velocity is based on position to create an "explosion" effect
      const velocity = explosionDir.clone().multiplyScalar(speed);

      // Add some randomness to the velocity
      velocity.x += (Math.random() - 0.5) * 0.1;
      velocity.y += (Math.random() - 0.5) * 0.1;
      velocity.z += (Math.random() - 0.5) * 0.1;

      // Random rotation speeds
      const rotationSpeed = new Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );

      const particleSize = (0.1 + Math.random() * 0.1) * effectScale;

      cubes.current.push({
        position: new Vector3(x, y, z).multiplyScalar(0.2), // Start closer together
        rotation: new Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed,
        velocity,
        size: particleSize, // Smaller, more uniform cubes
        life: 0,
        maxLife: 0.3 + Math.random() * 0.4, // Shorter but varied lifespan
      });
    }

    // Reset completed state
    effectCompleted.current = false;

    // Set proper lifespan for player death effect
    if (color === "#ff44aa") {
      lifespan.current = 0.5; // Match the 0.5 second game over delay
    }
  }, [color, scale]);

  // Animate cubes
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    timeElapsed.current += delta;

    // Update each cube
    for (let i = 0; i < cubes.current.length; i++) {
      const cube = cubes.current[i];

      // Update cube life
      cube.life += delta;

      // Update cube position with acceleration (faster movement over time)
      cube.velocity.y -= 0.02 * delta; // Gravity effect
      cube.position.add(cube.velocity.clone().multiplyScalar(delta * 5));

      // Update rotation
      cube.rotation.x += cube.rotationSpeed.x * delta;
      cube.rotation.y += cube.rotationSpeed.y * delta;
      cube.rotation.z += cube.rotationSpeed.z * delta;

      // Update mesh if it exists
      if (groupRef.current.children[i]) {
        const mesh = groupRef.current.children[i] as Mesh;
        mesh.position.copy(cube.position);
        mesh.rotation.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);

        // Fade out based on life
        const opacity = 1 - cube.life / cube.maxLife;
        const material = mesh.material as MeshStandardMaterial;
        material.opacity = opacity;

        // Shrink as it fades
        const shrinkFactor = Math.max(0.2, 1 - cube.life / cube.maxLife);
        mesh.scale.set(
          cube.size * shrinkFactor,
          cube.size * shrinkFactor,
          cube.size * shrinkFactor
        );
      }
    }

    // Check if effect is done
    if (timeElapsed.current >= lifespan.current && !effectCompleted.current) {
      effectCompleted.current = true;
      onComplete();
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {cubes.current.map((cube, index) => (
        <mesh key={index} position={cube.position}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            transparent={true}
            opacity={1.0}
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

export default DissolveEffect;
