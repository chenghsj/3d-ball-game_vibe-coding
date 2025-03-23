import { useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import Game from "./components/Game";
import { useStore } from "./store";
import { soundManager } from "./utils/SoundManager";
import SoundStatus from "./components/SoundStatus";
import DebugSoundStatus from "./components/DebugSoundStatus";
import "./App.css";

function App() {
  const score = useStore((state) => state.score);
  const level = useStore((state) => state.level);
  const isGameOver = useStore((state) => state.isGameOver);
  const restart = useStore((state) => state.restart);
  const maxBullets = useStore((state) => state.maxBullets);
  const bulletCount = useStore((state) => state.bulletCount);
  const bulletRegenCooldown = useStore((state) => state.bulletRegenCooldown);
  const [muted, setMuted] = useState(false);

  // Add function to toggle sound
  const toggleSound = () => {
    const newMutedState = soundManager.toggleMute();
    setMuted(newMutedState);
  };

  // Function to hide cursor during gameplay
  const updateCursorVisibility = useCallback(() => {
    if (isGameOver) {
      // Show cursor when game is over
      document.body.style.cursor = "auto";
    } else {
      // Hide cursor during gameplay
      document.body.style.cursor = "none";
    }
  }, [isGameOver]);

  // Update cursor visibility when game state changes
  useEffect(() => {
    updateCursorVisibility();
  }, [isGameOver, updateCursorVisibility]);

  // Show cursor when hovering over UI elements
  const showCursor = () => {
    if (!isGameOver) document.body.style.cursor = "pointer";
  };

  // Hide cursor when leaving UI elements
  const hideCursor = () => {
    if (!isGameOver) document.body.style.cursor = "none";
  };

  // Handle keyboard controls including M for mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle mute with M key
      if (e.key.toLowerCase() === "m") {
        toggleSound();
      }

      // Only use Enter for restart when game is over to avoid conflicts with shooting
      if (e.key === "Enter" && isGameOver) {
        // Simply restart, no need to set player visibility
        restart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGameOver, restart]);

  return (
    <div className="app-container">
      <div className="ui-overlay">
        {/* Add sound status component */}
        <SoundStatus />

        <h1>3D Ball Game</h1>

        {/* Update sound toggle button to show keyboard shortcut */}
        <button
          className="sound-toggle"
          onClick={toggleSound}
          title="Press M to toggle sound"
          onMouseEnter={showCursor}
          onMouseLeave={hideCursor}>
          {muted ? "🔇" : "🔊"}
        </button>

        <div className="score-container">
          <div className="score">Score: {score}</div>
          <div className="level">Level: {level}</div>
        </div>

        {bulletCount === 0 && bulletRegenCooldown > 0 && (
          <div className="ammo-status" onMouseEnter={showCursor} onMouseLeave={hideCursor}>
            <span>Auto-reloading: {Math.ceil(bulletRegenCooldown)}s</span>
            <span className="auto-reload-hint">
              (Keep holding F or Enter to auto-fire when ready)
            </span>
          </div>
        )}

        <div className="bullet-counter">
          Bullets: {bulletCount}/{maxBullets}
        </div>

        <div
          className="controls-info left-panel"
          onMouseEnter={showCursor}
          onMouseLeave={hideCursor}>
          <h3>How to Play</h3>
          <p>W/A/S/D or Arrow Keys: Move</p>
          <p>Space: Jump over obstacles</p>
          <p>F or Enter: Shoot forward</p>
          <p>M: Toggle sound on/off</p>
          <p>You have {maxBullets} bullets</p>
          <p>Bullets auto-reload after 10s when empty</p>
          <p>Level up every 10 points!</p>
          <p>Avoid red cubes to survive!</p>
          {isGameOver && <p className="restart-tip">Press Enter to restart</p>}
        </div>
      </div>

      {isGameOver && (
        <div className="game-over" onMouseEnter={showCursor} onMouseLeave={hideCursor}>
          <h2>Game Over!</h2>
          <p>Your score: {score}</p>
          <button onClick={restart}>Play Again</button>
          <p className="restart-tip">Or press Enter key</p>
        </div>
      )}

      {/* Add debug tool (hidden by default) */}
      <DebugSoundStatus />

      {/* Update Canvas with contained dimensions */}
      <Canvas
        camera={{
          position: [0, 5, 10],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}>
        <Game />
      </Canvas>
    </div>
  );
}

export default App;
