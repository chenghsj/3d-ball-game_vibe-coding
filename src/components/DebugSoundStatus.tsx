import React, { useState, useEffect } from "react";

interface SoundDebugInfo {
  sound: string;
  status: "loading" | "success" | "error";
  url: string;
}

const DebugSoundStatus: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);
  const [soundInfo, setSoundInfo] = useState<SoundDebugInfo[]>([]);

  useEffect(() => {
    // Function to test loading a sound
    const testSound = (name: string, url: string) => {
      const audio = new Audio(url);

      const info: SoundDebugInfo = {
        sound: name,
        status: "loading",
        url,
      };

      setSoundInfo((prev) => [...prev, info]);

      audio.addEventListener("canplaythrough", () => {
        setSoundInfo((prev) =>
          prev.map((item) => (item.sound === name ? { ...item, status: "success" } : item))
        );
      });

      audio.addEventListener("error", () => {
        setSoundInfo((prev) =>
          prev.map((item) => (item.sound === name ? { ...item, status: "error" } : item))
        );
      });

      // Attempt to load
      audio.load();
    };

    // Enable debug mode with keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "D" && e.ctrlKey && e.shiftKey) {
        setShowDebug((prev) => !prev);

        // If enabling and no sounds tested yet, run tests
        if (soundInfo.length === 0) {
          const baseUrl = import.meta.env.BASE_URL || "/";
          const sounds = [
            { name: "shoot", url: `${baseUrl}sounds/laser-shoot.mp3` },
            { name: "explosion", url: `${baseUrl}sounds/explosion.mp3` },
            { name: "jump", url: `${baseUrl}sounds/jump.mp3` },
            { name: "gameOver", url: `${baseUrl}sounds/game-over.mp3` },
            { name: "levelUp", url: `${baseUrl}sounds/level-up.mp3` },
            { name: "bulletReload", url: `${baseUrl}sounds/reload.mp3` },
            { name: "hit", url: `${baseUrl}sounds/hit.mp3` },
          ];

          sounds.forEach((sound) => testSound(sound.name, sound.url));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [soundInfo.length]);

  if (!showDebug) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "rgba(0,0,0,0.8)",
        padding: "15px",
        borderRadius: "5px",
        maxWidth: "400px",
        maxHeight: "400px",
        overflow: "auto",
        zIndex: 9999,
        color: "white",
        fontFamily: "monospace",
        fontSize: "12px",
      }}>
      <h3>Sound Debug (Ctrl+Shift+D)</h3>
      <p>Base URL: {import.meta.env.BASE_URL || "/"}</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {soundInfo.map((info, i) => (
          <li
            key={i}
            style={{
              margin: "8px 0",
              color:
                info.status === "success"
                  ? "#4caf50"
                  : info.status === "error"
                  ? "#f44336"
                  : "#ffeb3b",
            }}>
            {info.sound}: {info.status}
            <div style={{ fontSize: "10px", wordBreak: "break-all" }}>{info.url}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DebugSoundStatus;
