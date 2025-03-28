import React, { useEffect, useRef } from "react";
import { useStore } from "../store";

// Maximum movement for a touch to be considered a tap
const TAP_THRESHOLD = 10;
// Minimum distance for a swipe up to be detected
const SWIPE_THRESHOLD = 50;
// Maximum time for a swipe to be recognized (ms)
const SWIPE_TIMEOUT = 300;
// Fixed speed for player movement (prevents acceleration issues)
const FIXED_MOVE_SPEED = 0.12;

interface TouchControlsProps {
  onMove: (x: number, z: number) => void;
  onJump: () => void;
  onShoot: () => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({ onMove, onJump, onShoot }) => {
  const isGameOver = useStore((state) => state.isGameOver);
  // Add bullet count from store to check if shooting is possible
  const bulletCount = useStore((state) => state.bulletCount);

  // Reference to store touch start position and time
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isTouchActiveRef = useRef(false);
  const hasMoved = useRef(false);

  // Handle touch start
  const handleTouchStart = (e: TouchEvent) => {
    if (isGameOver) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    isTouchActiveRef.current = true;
    hasMoved.current = false;

    // Stop any existing movement immediately
    onMove(0, 0);
  };

  // Handle touch move
  const handleTouchMove = (e: TouchEvent) => {
    if (isGameOver || !isTouchActiveRef.current) return;

    const touch = e.touches[0];

    // Calculate distance from start position
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Track if there was significant movement (to distinguish from taps)
    if (Math.abs(deltaX) > TAP_THRESHOLD || Math.abs(deltaY) > TAP_THRESHOLD) {
      hasMoved.current = true;
    }

    // Only move if there's actual movement
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      // Calculate the direction vector (normalized between -1 and 1)
      const MAX_DRAG_DISTANCE = 50; // Maximum pixel distance for full speed

      // Clamp values between -1 and 1 for consistent control
      const directionX = Math.max(-1, Math.min(1, deltaX / MAX_DRAG_DISTANCE));
      const directionZ = Math.max(-1, Math.min(1, deltaY / MAX_DRAG_DISTANCE));

      // Apply fixed speed in the direction of movement
      // This prevents acceleration as the player's finger moves further
      const moveX = directionX * FIXED_MOVE_SPEED;
      const moveZ = directionZ * FIXED_MOVE_SPEED;

      // Call onMove with the fixed-speed movement
      onMove(moveX, moveZ);
    } else {
      // No significant movement, stop the player
      onMove(0, 0);
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: TouchEvent) => {
    if (isGameOver) return;

    // Reset movement when touch ends
    onMove(0, 0);

    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartRef.current.time;

    // If this was a short touch without movement, it's a tap (jump)
    if (!hasMoved.current && touchDuration < 200) {
      // Simple tap now triggers jump
      onJump();
      console.log("Jump triggered by tap");
    }
    // Check if it was a swipe up (shoot) and if we have bullets
    else if (e.changedTouches.length > 0 && touchDuration < SWIPE_TIMEOUT) {
      const touch = e.changedTouches[0];
      const deltaY = touchStartRef.current.y - touch.clientY;

      // If swiped up with enough force
      if (deltaY > SWIPE_THRESHOLD) {
        // Only shoot if we have bullets available
        if (bulletCount > 0) {
          onShoot();
          console.log("Shoot triggered by swipe up");
        } else {
          // Don't play any sound, just log the failure
          // This completely avoids playing a sound when out of bullets
          console.log("Cannot shoot - no bullets available");
        }
      }
    }

    isTouchActiveRef.current = false;
  };

  // Set up and cleanup event listeners
  useEffect(() => {
    // Add touch event listeners to document
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isGameOver]);

  // This component doesn't render anything visible
  return null;
};

export default TouchControls;
