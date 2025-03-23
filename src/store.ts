import { create } from "zustand";
import { Vector3 } from "three";
import { soundManager } from "./utils/SoundManager";

interface Obstacle {
  position: Vector3;
  id: string;
  scale?: number; // Add optional scale property
  rotationSpeed?: number; // Add optional rotation speed
}

interface Bullet {
  position: Vector3;
  id: string;
  direction: Vector3;
  lifetime: number; // Add lifetime property to track how long the bullet has existed
}

interface Effect {
  position: Vector3;
  id: string;
  color: string;
  scale?: number;
  onComplete?: () => void; // Add optional callback
}

interface GameState {
  score: number;
  level: number; // Add level tracking
  isGameOver: boolean;
  obstacles: Obstacle[];
  bullets: Bullet[];
  bulletCount: number; // Track how many bullets the player has left
  maxBullets: number; // Add maximum bullet limit
  bulletRegenCooldown: number; // Add cooldown tracker for bullet regeneration
  effects: Effect[];
  addObstacle: (obstacle: Obstacle) => void;
  removeObstacle: (id: string) => void;
  moveObstacles: () => void;
  addBullet: (bullet: Omit<Bullet, "lifetime">) => void; // Modify to automatically add lifetime
  removeBullet: (id: string) => void;
  moveBullets: () => void;
  incrementScore: () => void;
  setGameOver: (value: boolean) => void;
  restart: () => void;
  updateBulletLifetimes: (deltaTime: number) => void; // Add new function to track bullet lifetimes
  updateBulletRegen: (deltaTime: number) => void; // Add function to handle bullet regeneration
  refillBullets: () => void; // Add a function to refill bullets
  addEffect: (effect: Effect) => void;
  removeEffect: (id: string) => void;

  // Add new functions for level management
  checkLevelUp: () => void;
  getObstacleSpawnInterval: () => number;
  getObstacleSpeed: () => number;
}

export const useStore = create<GameState>((set, get) => ({
  score: 0,
  level: 1, // Start at level 1
  isGameOver: false,
  obstacles: [],
  bullets: [],
  bulletCount: 5, // Start with 5 bullets
  maxBullets: 5, // Set maximum allowed bullets at once
  bulletRegenCooldown: 0, // Initialize cooldown timer to 0
  effects: [],

  addObstacle: (obstacle) =>
    set((state) => ({
      obstacles: [...state.obstacles, obstacle],
    })),

  removeObstacle: (id) =>
    set((state) => ({
      obstacles: state.obstacles.filter((obstacle) => obstacle.id !== id),
    })),

  moveObstacles: () =>
    set((state) => {
      const speed = get().getObstacleSpeed();
      return {
        obstacles: state.obstacles.map((obstacle) => ({
          ...obstacle,
          position: new Vector3(
            obstacle.position.x,
            obstacle.position.y,
            obstacle.position.z + speed
          ),
        })),
      };
    }),

  addBullet: (bullet) =>
    set((state) => {
      // Only add a new bullet if player has bullets left
      if (state.bulletCount <= 0) {
        return state; // Don't add more bullets if none left
      }

      // Decrease bullet count and add the bullet
      const newBulletCount = state.bulletCount - 1;

      // If this was the last bullet, start the cooldown automatically
      if (newBulletCount === 0) {
        return {
          bulletCount: 0,
          bulletRegenCooldown: 10, // Start 10 second cooldown automatically
          bullets: [...state.bullets, { ...bullet, lifetime: 0 }],
        };
      }

      // Otherwise just add the bullet and decrease count
      return {
        bulletCount: newBulletCount,
        bullets: [...state.bullets, { ...bullet, lifetime: 0 }],
      };
    }),

  removeBullet: (id) =>
    set((state) => ({
      bullets: state.bullets.filter((bullet) => bullet.id !== id),
    })),

  moveBullets: () =>
    set((state) => ({
      bullets: state.bullets.map((bullet) => ({
        ...bullet,
        position: new Vector3(
          bullet.position.x + bullet.direction.x * 0.8,
          bullet.position.y + bullet.direction.y * 0.8,
          bullet.position.z + bullet.direction.z * 0.8
        ),
      })),
    })),

  updateBulletLifetimes: (deltaTime) =>
    set((state) => ({
      bullets: state.bullets
        .map((bullet) => ({
          ...bullet,
          lifetime: bullet.lifetime + deltaTime,
        }))
        .filter((bullet) => bullet.lifetime < 2), // Remove bullets older than 2 seconds
    })),

  updateBulletRegen: (deltaTime) =>
    set((state) => {
      // If there's an active cooldown and we're out of bullets
      if (state.bulletRegenCooldown > 0 && state.bulletCount === 0) {
        const newCooldown = Math.max(0, state.bulletRegenCooldown - deltaTime);

        // If cooldown reached 0, refill bullets automatically and play sound
        if (newCooldown === 0) {
          soundManager.play("bulletReload", 0.6);
          return {
            bulletRegenCooldown: 0,
            bulletCount: state.maxBullets, // Refill to max
          };
        }

        // Otherwise just update the cooldown timer
        return {
          bulletRegenCooldown: newCooldown,
        };
      }
      return state;
    }),

  refillBullets: () =>
    set((state) => ({
      bulletCount: state.maxBullets,
      bulletRegenCooldown: 0,
    })),

  incrementScore: () =>
    set((state) => {
      const newScore = state.score + 1;
      return {
        score: newScore,
      };
    }),

  // Add a function to check if level up is needed
  checkLevelUp: () => {
    const { score, level } = get();
    const newLevel = Math.floor(score / 10) + 1;

    if (newLevel > level) {
      set({ level: newLevel });

      // Check if we need to increase max bullets - changed to every 100 points
      if (score % 100 === 0 && score > 0) {
        const newMaxBullets = get().maxBullets + 5;
        soundManager.play("levelUp", 0.8); // Play sound for bullet upgrade
        set({
          maxBullets: newMaxBullets,
          bulletCount: newMaxBullets, // Also refill bullets to the new maximum
        });
      }
    }
  },

  // Get spawn interval based on level (decreases as level increases)
  getObstacleSpawnInterval: () => {
    const { level } = get();
    // Adjusted interval to be much faster
    // Level 1: ~1200ms
    // Level 5: ~800ms
    // Level 10: ~500ms
    return Math.max(1200 - level * 70, 500);
  },

  // Get obstacle speed based on level (increases as level increases)
  getObstacleSpeed: () => {
    const { level } = get();
    // Base speed is 0.2, increases by 0.02 per level, with a cap at level 10
    return 0.2 + Math.min((level - 1) * 0.02, 0.2);
  },

  setGameOver: (value) =>
    set({
      isGameOver: value,
    }),

  restart: () => {
    set({
      score: 0,
      level: 1,
      isGameOver: false,
      obstacles: [],
      bullets: [],
      bulletCount: 5,
      maxBullets: 5, // Reset to initial value
      bulletRegenCooldown: 0,
      effects: [], // Clear all active effects
    });
  },

  addEffect: (effect) =>
    set((state) => ({
      effects: [...state.effects, effect],
    })),

  removeEffect: (id) =>
    set((state) => ({
      effects: state.effects.filter((effect) => effect.id !== id),
    })),
}));
