import React, { useRef, useEffect, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../store";
import * as THREE from "three";
import { Vector3 } from "three";
import { soundManager } from "../utils/SoundManager";

// Helper function to merge refs - add this before the component definition
function useMergedRef<T>(...refs: (React.Ref<T> | null | undefined)[]) {
  return React.useCallback(
    (instance: T | null) => {
      refs.forEach((ref) => {
        if (typeof ref === "function") {
          ref(instance);
        } else if (ref) {
          (ref as React.MutableRefObject<T | null>).current = instance;
        }
      });
    },
    [refs]
  );
}

// Define the component with proper ref typing
const Player = forwardRef<THREE.Mesh, {}>((_, ref) => {
  const isGameOver = useStore((state) => state.isGameOver);
  const addBullet = useStore((state) => state.addBullet);
  const bulletCount = useStore((state) => state.bulletCount);
  const bulletRegenCooldown = useStore((state) => state.bulletRegenCooldown);
  const velocity = useRef(new Vector3());
  const isJumping = useRef(false);
  const jumpTime = useRef(0);
  const jumpDuration = 0.5; // Total time for a jump cycle in seconds
  const maxJumpHeight = 2.0; // Increased from 1.2 to 2.0 for higher jumps
  const position = useRef(new Vector3(0, 0.5, 0));
  const groundLevel = 0.5; // Define constant for ground level
  const shootCooldown = useRef(0);
  const movementDirection = useRef(new Vector3(0, 0, -1)); // Track player's movement direction
  const lastBulletCountRef = useRef(bulletCount);
  const fKeyPressed = useRef(false);
  const lastShootDirectionRef = useRef(new Vector3(0, 0, -1));

  // Create a local ref for internal use to avoid TypeScript errors
  const localRef = useRef<THREE.Mesh>(null);
  // Use merged ref to handle both the forwarded ref and local ref
  const meshRef = useMergedRef(ref, localRef);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;

      switch (e.key) {
        // Arrow keys for alternative movement
        case "ArrowLeft":
          velocity.current.x = -0.2;
          movementDirection.current.set(-1, 0, 0);
          break;
        case "ArrowRight":
          velocity.current.x = 0.2;
          movementDirection.current.set(1, 0, 0);
          break;
        case "ArrowUp":
          velocity.current.z = -0.2; // Forward (into the screen)
          movementDirection.current.set(0, 0, -1);
          break;
        case "ArrowDown":
          velocity.current.z = 0.2; // Backward (toward the camera)
          movementDirection.current.set(0, 0, 1);
          break;

        // WASD for movement - corrected directions
        case "a":
          velocity.current.x = -0.2; // Left
          movementDirection.current.set(-1, 0, 0);
          break;
        case "d":
          velocity.current.x = 0.2; // Right
          movementDirection.current.set(1, 0, 0);
          break;
        case "w":
          velocity.current.z = -0.2; // Forward (into the screen)
          movementDirection.current.set(0, 0, -1);
          break;
        case "s":
          velocity.current.z = 0.2; // Backward (toward the camera)
          movementDirection.current.set(0, 0, 1);
          break;

        // Space for jumping
        case " ":
          // Only allow jumping when on or near ground and not already jumping
          if (!isJumping.current && localRef.current && localRef.current.position.y <= 0.51) {
            isJumping.current = true;
            jumpTime.current = 0;
            soundManager.play("jump", 0.05);
            e.preventDefault(); // Prevent space from affecting other controls
          }
          break;

        // F or Enter key for shooting forward (negative Z direction)
        case "f":
        case "Enter":
          fKeyPressed.current = true;
          const forwardDirection = new Vector3(0, 0, -1);
          lastShootDirectionRef.current = forwardDirection.clone();
          shootBullet(forwardDirection);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
          if (velocity.current.x < 0) velocity.current.x = 0;
          break;
        case "ArrowRight":
        case "d":
          if (velocity.current.x > 0) velocity.current.x = 0;
          break;
        case "ArrowUp":
        case "w":
          if (velocity.current.z < 0) velocity.current.z = 0;
          break;
        case "ArrowDown":
        case "s":
          if (velocity.current.z > 0) velocity.current.z = 0;
          break;
      }

      // Track when F or Enter key is released
      if (e.key === "f" || e.key === "Enter") {
        fKeyPressed.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isGameOver, addBullet]);

  // Helper function to shoot bullets in the specified direction
  const shootBullet = (direction: Vector3) => {
    if (shootCooldown.current <= 0 && localRef.current && bulletCount > 0) {
      // Play shoot sound
      soundManager.play("shoot", 0.2);

      const bulletPosition = new Vector3().copy(localRef.current.position);

      // Offset the bullet starting position in the shooting direction
      bulletPosition.add(direction.clone().multiplyScalar(0.8));
      bulletPosition.y += 0.2;

      addBullet({
        position: bulletPosition,
        id: Date.now().toString(),
        direction: direction.clone(),
      });
      shootCooldown.current = 0.3; // Set cooldown time
    }
  };

  useFrame((_state, delta) => {
    if (isGameOver || !localRef.current) return;

    // Update shooting cooldown
    if (shootCooldown.current > 0) {
      shootCooldown.current -= delta;
    }

    // Auto-shoot logic: if F key was pressed when bullets ran out, and they're now refilled
    if (
      fKeyPressed.current &&
      lastBulletCountRef.current === 0 &&
      bulletCount > 0 &&
      bulletRegenCooldown === 0
    ) {
      // Auto-shoot when bullets are refilled while F is held down
      shootBullet(lastShootDirectionRef.current);
    }

    // Update the last bullet count reference
    lastBulletCountRef.current = bulletCount;

    // Handle arcade-style jump with fixed animation
    if (isJumping.current) {
      // Increment jump time
      jumpTime.current += delta;

      // Calculate jump progress (0 to 1 and back to 0)
      const jumpProgress = Math.sin(Math.PI * (jumpTime.current / jumpDuration));

      // Set y position directly using a sine curve for smooth up and down
      localRef.current.position.y = groundLevel + jumpProgress * maxJumpHeight;

      // End jump when the cycle is complete
      if (jumpTime.current >= jumpDuration) {
        isJumping.current = false;
        localRef.current.position.y = groundLevel;
      }
    }

    // Update position for x and z axes
    localRef.current.position.x += velocity.current.x;
    localRef.current.position.z += velocity.current.z;

    // Update position bounds
    const xLimit = 3; // Half the ground width minus a small margin
    const zLimitForward = -15; // Allow going very far forward (W key / up arrow)
    const zLimitBackward = 4; // Limit backward movement (S key / down arrow) to stay on screen

    localRef.current.position.x = Math.max(Math.min(localRef.current.position.x, xLimit), -xLimit);

    // Set different limits for forward and backward movement
    if (localRef.current.position.z < zLimitForward) {
      localRef.current.position.z = zLimitForward;
    }
    if (localRef.current.position.z > zLimitBackward) {
      localRef.current.position.z = zLimitBackward;
    }

    // Store current position for reference
    position.current.copy(localRef.current.position);
  });

  return (
    <mesh ref={meshRef} position={[0, groundLevel, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial
        color="#ff44aa" // Original bright pink color
        emissive="#ff0088" // Original emission color
        emissiveIntensity={0.5} // Original emission intensity
        metalness={0} // No metalness/reflection
        roughness={1} // Maximum roughness for matte appearance
      />
      {/* Add a point light to make player glow */}
      <pointLight color="#ff88bb" intensity={1.0} distance={2} decay={2} />
    </mesh>
  );
});

export default Player;
