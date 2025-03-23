import React, { useEffect, useState } from "react";
import { soundManager } from "../utils/SoundManager";

const SoundStatus: React.FC = () => {
  const [showMessage, setShowMessage] = useState(false);
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  useEffect(() => {
    // Show the message after a brief delay
    const timer = setTimeout(() => {
      // Check if we're running in a browser that potentially blocks audio
      const isBrowser = typeof window !== "undefined";
      if (isBrowser) {
        try {
          // Try to create a context to see if it's suspended
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === "suspended") {
            setShowMessage(true);
          }
          // Clean up
          if (audioContext.state !== "closed") {
            audioContext.close().catch(() => {});
          }
        } catch (e) {
          // If we can't create a context, we might still need audio interaction
          setShowMessage(true);
        }
      }
    }, 2000);

    // Check if sound files are loaded
    const checkSounds = setTimeout(() => {
      // Test playing a sound with zero volume to check if loaded
      try {
        soundManager.play("jump", 0);
        setSoundsLoaded(true);
      } catch (e) {
        setSoundsLoaded(false);
        console.warn("Sound test failed:", e);
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(checkSounds);
    };
  }, []);

  if (!showMessage && soundsLoaded) return null;

  return (
    <div className="sound-notice">
      <p>
        📢 {!soundsLoaded ? "Loading sounds... " : ""}
        Click anywhere to enable sound effects
        <button className="sound-dismiss" onClick={() => setShowMessage(false)}>
          ✕
        </button>
      </p>
    </div>
  );
};

export default SoundStatus;
