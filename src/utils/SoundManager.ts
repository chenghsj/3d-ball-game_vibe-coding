class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private baseUrl: string = "";

  constructor() {
    // Get the base URL for loading sounds correctly when deployed to GitHub Pages
    this.baseUrl = import.meta.env.BASE_URL || "/";

    // We'll initialize audio context on first user interaction
    this.initOnInteraction();
    this.preloadSounds();
  }

  // Initialize audio context on user interaction to comply with browser policies
  private initOnInteraction(): void {
    const initFunc = () => {
      if (!this.isInitialized) {
        try {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          this.isInitialized = true;

          // Now decode the audio data for faster playback
          this.decodeBuffers();
        } catch (e) {
          console.warn("Could not initialize audio context:", e);
        }

        // Remove event listeners once initialized
        document.removeEventListener("click", initFunc);
        document.removeEventListener("keydown", initFunc);
        document.removeEventListener("touchstart", initFunc);
      }
    };

    document.addEventListener("click", initFunc);
    document.addEventListener("keydown", initFunc);
    document.addEventListener("touchstart", initFunc);
  }

  // Preload audio files
  private preloadSounds(): void {
    // Define sounds with their paths - updated to use baseUrl
    const soundFiles: Record<string, string> = {
      shoot: `${this.baseUrl}sounds/laser-shoot.mp3`,
      explosion: `${this.baseUrl}sounds/explosion.mp3`,
      jump: `${this.baseUrl}sounds/jump.mp3`,
      gameOver: `${this.baseUrl}sounds/game-over.mp3`,
      levelUp: `${this.baseUrl}sounds/level-up.mp3`,
      bulletReload: `${this.baseUrl}sounds/reload.mp3`,
      hit: `${this.baseUrl}sounds/hit.mp3`,
    };

    // Create audio elements for fallback
    Object.entries(soundFiles).forEach(([name, url]) => {
      try {
        // Log the full URL to help with debugging
        console.log(`Loading sound: ${name} from ${url}`);

        const audio = new Audio(url);
        audio.preload = "auto";
        this.sounds.set(name, audio);

        // Also fetch for Web Audio API
        this.fetchSound(name, url);
      } catch (e) {
        console.warn(`Error preloading sound ${name}:`, e);
      }
    });
  }

  // Fetch sound files and store them as ArrayBuffers
  private fetchSound(name: string, url: string): void {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (this.audioContext) {
          this.decodeAudioData(name, arrayBuffer);
        } else {
          try {
            // Save for later decoding when context is available
            const array = Array.from(new Uint8Array(arrayBuffer));
            // Only store if it's a reasonable size
            if (array.length < 1000000) {
              // 1MB limit for localStorage
              localStorage.setItem(`sound_${name}`, JSON.stringify(array));
            }
          } catch (e) {
            console.warn(`Could not store sound ${name} in localStorage:`, e);
          }
        }
      })
      .catch((error) => {
        console.warn(`Error fetching sound ${name}:`, error);
      });
  }

  // Decode audio data
  private decodeAudioData(name: string, arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext) return;

    try {
      this.audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          this.soundBuffers.set(name, buffer);
        },
        (error) => {
          console.warn(`Error decoding sound ${name}:`, error);
        }
      );
    } catch (e) {
      console.warn(`Error initiating decoding for sound ${name}:`, e);
    }
  }

  // Decode any buffered sounds once context is initialized
  private decodeBuffers(): void {
    if (!this.audioContext) return;

    try {
      // Try to decode any stored buffers
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sound_")) {
          const name = key.replace("sound_", "");
          try {
            const array = JSON.parse(localStorage.getItem(key) || "[]");
            if (Array.isArray(array)) {
              const arrayBuffer = new Uint8Array(array).buffer;
              this.decodeAudioData(name, arrayBuffer);
            }
          } catch (e) {
            console.warn(`Error decoding stored sound ${name}:`, e);
            // Clean up invalid entries
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn("Error accessing localStorage:", e);
    }
  }

  // Play a sound with minimal latency
  play(name: string, volume = 0.5): void {
    if (this.isMuted) return;

    // Try to play using Web Audio API for less latency
    if (this.audioContext && this.soundBuffers.has(name)) {
      this.playWithWebAudio(name, volume);
    } else {
      // Fallback to HTML Audio
      this.playWithHtmlAudio(name, volume);
    }
  }

  // Play using Web Audio API for better performance
  private playWithWebAudio(name: string, volume: number): void {
    if (!this.audioContext) return;

    const buffer = this.soundBuffers.get(name);
    if (!buffer) return;

    try {
      // Create source and gain nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      // Configure nodes
      source.buffer = buffer;
      gainNode.gain.value = volume;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start playback
      source.start(0);
    } catch (e) {
      console.warn(`Error playing sound ${name} with Web Audio API:`, e);
      // Fall back to HTML Audio if Web Audio fails
      this.playWithHtmlAudio(name, volume);
    }
  }

  // Fallback to HTML Audio
  private playWithHtmlAudio(name: string, volume: number): void {
    const sound = this.sounds.get(name);
    if (!sound) return;

    try {
      // Create a clone to allow overlapping sounds
      const clone = sound.cloneNode(true) as HTMLAudioElement;
      clone.volume = volume;

      const playPromise = clone.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented, this is expected in many browsers
          if (error.name !== "NotAllowedError") {
            console.warn(`Error playing sound ${name}:`, error);
          }
        });
      }
    } catch (e) {
      console.warn(`Error playing sound ${name}:`, e);
    }
  }

  mute(): void {
    this.isMuted = true;
  }

  unmute(): void {
    this.isMuted = false;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

// Export a singleton instance
export const soundManager = new SoundManager();
