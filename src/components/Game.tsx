import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "../store";
import * as THREE from "three";
import { Vector3 } from "three";
import Player from "./Player";
import Obstacle from "./Obstacle";
import Ground from "./Ground";
import Bullet from "./Bullet";
import DissolveEffect from "./DissolveEffect";
import { soundManager } from "../utils/SoundManager";

// Improve camera handling with responsive viewport
const Game: React.FC = () => {
  const obstacles = useStore((state) => state.obstacles);
  const bullets = useStore((state) => state.bullets);
  const addObstacle = useStore((state) => state.addObstacle);
  const moveObstacles = useStore((state) => state.moveObstacles);
  const moveBullets = useStore((state) => state.moveBullets);
  const removeObstacle = useStore((state) => state.removeObstacle);
  const removeBullet = useStore((state) => state.removeBullet);
  const incrementScore = useStore((state) => state.incrementScore);
  const isGameOver = useStore((state) => state.isGameOver);
  const playerRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const updateBulletLifetimes = useStore((state) => state.updateBulletLifetimes);
  const updateBulletRegen = useStore((state) => state.updateBulletRegen);
  const checkLevelUp = useStore((state) => state.checkLevelUp);
  const getObstacleSpawnInterval = useStore((state) => state.getObstacleSpawnInterval);
  const level = useStore((state) => state.level);
  const effects = useStore((state) => state.effects);
  const addEffect = useStore((state) => state.addEffect);
  const removeEffect = useStore((state) => state.removeEffect);
  const [playerDying, setPlayerDying] = useState(false);
  const setGameOver = useStore((state) => state.setGameOver);

  // Ref to track the interval ID for cleanup
  const spawnIntervalRef = useRef<number | null>(null);

  // Adjust camera and game elements based on screen size
  useEffect(() => {
    // Update camera to maintain proper view regardless of aspect ratio
    if (camera instanceof THREE.PerspectiveCamera) {
      // Adjust position based on aspect ratio
      const aspectRatio = size.width / size.height;

      if (aspectRatio < 1) {
        // For portrait orientation (mobile)
        camera.position.set(0, 6, 12); // Move camera back and up more
      } else {
        // For landscape orientation (desktop)
        camera.position.set(0, 5, 10);
      }

      camera.lookAt(0, 0, -5); // Look slightly ahead
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);

  // Generate obstacles at intervals that change with level
  useEffect(() => {
    if (isGameOver) return;

    // Clear any existing interval when level changes
    if (spawnIntervalRef.current) {
      clearTimeout(spawnIntervalRef.current);
    }

    // Random function to make spawning less predictable
    const spawnRandomObstacle = () => {
      // Spawn based on level - more obstacles at higher levels
      const minObstacles = 1;
      const maxObstaclesPerWave = Math.min(level, 4);
      const obstacleCount =
        minObstacles + Math.floor(Math.random() * (maxObstaclesPerWave - minObstacles + 1));

      // Spawn multiple obstacles in different patterns
      for (let i = 0; i < obstacleCount; i++) {
        // Use full width of the ground with some randomness
        const x = Math.random() * 6 - 3;
        const y = 0.5;

        // Randomize z position to create more interesting patterns
        const baseZ = -20;
        const zVariation = Math.random() * 3;
        // Stagger obstacles in a wave pattern
        const z = baseZ - zVariation - i * 1.5;

        addObstacle({
          position: new Vector3(x, y, z),
          id: Date.now().toString() + "-" + i + "-" + Math.random().toString(36).substr(2, 5),
          scale: 0.5 + Math.random() * 0.5,
          rotationSpeed: Math.random() * 0.5,
        });
      }
    };

    // Create a continuous spawning system
    const spawnContinuously = () => {
      // Base timing parameters - shorter intervals for more continuous spawning
      const baseInterval = Math.max(getObstacleSpawnInterval() * 0.7, 400); // Faster than before

      // Add some small randomness to prevent predictable patterns
      const variance = 200; // 200ms variance
      const nextSpawnTime = baseInterval + (Math.random() * variance - variance / 2);

      // Schedule the next spawn with setTimeout
      const timerId = setTimeout(() => {
        if (!isGameOver) {
          spawnRandomObstacle();
          // Continue the spawn cycle
          const nextTimer = spawnContinuously();
          spawnIntervalRef.current = nextTimer as unknown as number;
        }
      }, nextSpawnTime);

      return timerId;
    };

    // Start the continuous spawning immediately
    spawnRandomObstacle(); // Spawn initial obstacles immediately

    // Then start the continuous cycle
    const timerId = spawnContinuously();
    spawnIntervalRef.current = timerId as unknown as number;

    return () => {
      if (spawnIntervalRef.current) {
        clearTimeout(spawnIntervalRef.current);
      }
    };
  }, [addObstacle, isGameOver, level, getObstacleSpawnInterval]);

  // Game loop
  useFrame((_state, delta) => {
    // Allow game to continue during player death animation
    if (isGameOver && !playerDying) return;

    // Move obstacles forward
    moveObstacles();

    // Move bullets
    moveBullets();

    // Update bullet lifetimes
    updateBulletLifetimes(delta);

    // Update bullet regeneration cooldown
    updateBulletRegen(delta);

    // Check for collisions and remove obstacles that passed
    obstacles.forEach((obstacle) => {
      // Remove obstacles that passed the player
      if (obstacle.position.z > 5) {
        removeObstacle(obstacle.id);
        incrementScore();

        // Play sound when leveling up
        const oldLevel = level;
        checkLevelUp();
        if (level > oldLevel) {
          soundManager.play("levelUp", 0.7);
        }
      }

      // Check collision with player - reduced collision threshold
      if (playerRef.current && !isGameOver && !playerDying) {
        const distance = playerRef.current.position.distanceTo(obstacle.position);
        const playerRadius = 0.5; // Player sphere radius
        const obstacleRadius = obstacle.scale ? obstacle.scale * 0.5 : 0.5; // Estimate obstacle radius
        const collisionThreshold = playerRadius + obstacleRadius * 0.7; // Reduced threshold by 30%

        if (distance < collisionThreshold) {
          // Mark player as dying (for animation) but DON'T set game over yet
          setPlayerDying(true);

          // Play explosion sound
          soundManager.play("explosion", 0.8); // Reduced volume from 3 to 0.8

          // Hide player model immediately
          if (playerRef.current) {
            playerRef.current.visible = false;
          }

          // Create unique ID for death effect
          const deathEffectId = `player-death-${Date.now()}`;

          // Add the player death effect
          addEffect({
            position: playerRef.current.position.clone(),
            id: deathEffectId,
            color: "#ff44aa",
            scale: 1.2,
          });

          // Set a reliable timeout to end the game exactly 0.5 seconds after collision
          setTimeout(() => {
            // Play game over sound
            soundManager.play("gameOver", 0.6);

            // Set game over state after animation plays
            setGameOver(true);
            setPlayerDying(false);
            console.log("Game over triggered after player death");
          }, 500); // Changed to 0.5 seconds (500ms)

          removeObstacle(obstacle.id);
          return; // Exit the loop after handling collision
        }
      }
    });

    // Only add explosion effects for obstacles hit by bullets
    bullets.forEach((bullet) => {
      // Remove bullets that went too far
      if (bullet.position.z < -30) {
        removeBullet(bullet.id);
      }

      // Check collision with obstacles
      obstacles.forEach((obstacle) => {
        const distance = bullet.position.distanceTo(obstacle.position);
        if (distance < 1) {
          // Play hit sound
          soundManager.play("hit", 0.5);

          // Add explosion effect for obstacle only
          addEffect({
            position: obstacle.position.clone(),
            id: `shot-${obstacle.id}-${bullet.id}`,
            color: getObstacleColorByLevel(level, Math.floor(Math.random() * 3)),
            scale: obstacle.scale || 1.0,
          });

          // Collision detected, remove both bullet and obstacle
          removeBullet(bullet.id);
          removeObstacle(obstacle.id);
          incrementScore();
          // Check for level up after incrementing score
          checkLevelUp();
        }
      });
    });
  });

  // Use an explicit effect to handle game restarts and ensure player visibility
  useEffect(() => {
    // When game state changes from game over to not game over (restart),
    // ensure the player is visible
    if (!isGameOver) {
      // Use a slight delay to ensure all game state is reset first
      const timer = setTimeout(() => {
        // If we have a ref to the player, make sure it's visible and positioned correctly
        if (playerRef.current) {
          playerRef.current.visible = true;
          playerRef.current.position.set(0, 0.5, 0);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isGameOver]);

  // Reset player visibility and state on game restart
  useEffect(() => {
    if (!isGameOver && playerRef.current) {
      // Make player visible again and reset to starting position
      playerRef.current.visible = true;
      playerRef.current.position.set(0, 0.5, 0);
      setPlayerDying(false);
    }
  }, [isGameOver]);

  // Helper function to get colors consistent with obstacles
  const getObstacleColorByLevel = (level: number, type: number) => {
    const colors = ["#ff3333", "#ff6600", "#ff0066", "#ff3399", "#ff00cc", "#cc00ff", "#6600ff"];

    const baseIndex = Math.min(Math.floor(level / 2), colors.length - 3);
    return colors[baseIndex + (type % 3)];
  };

  return (
    <>
      <ambientLight intensity={0.5} color="#ccddff" /> {/* Reduced intensity */}
      <directionalLight position={[10, 10, 5]} intensity={1.2} color="#ffffff" />{" "}
      {/* Adjusted intensity */}
      <directionalLight position={[-5, 8, -10]} intensity={0.4} color="#8866ff" />{" "}
      {/* Reduced colored light */}
      <OrbitControls enabled={false} />
      <fog attach="fog" args={["#101035", 15, 40]} /> {/* Bluer fog */}
      <Player ref={playerRef} />
      <Ground />
      {obstacles.map((obstacle) => (
        <Obstacle
          key={obstacle.id}
          position={obstacle.position}
          scale={obstacle.scale}
          rotationSpeed={obstacle.rotationSpeed}
        />
      ))}
      {bullets.map((bullet) => (
        <Bullet key={bullet.id} position={bullet.position} />
      ))}
      {/* Render explosion effects */}
      {effects.map((effect) => (
        <DissolveEffect
          key={effect.id}
          position={effect.position}
          color={effect.color}
          scale={effect.scale}
          onComplete={() => removeEffect(effect.id)}
        />
      ))}
    </>
  );
};

export default Game;
