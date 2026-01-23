import { useCallback, useRef } from "react";
import confetti from "canvas-confetti";

// Bell/chime hang Base64 formátumban (rövid, kellemes csengő)
const CELEBRATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JjYqBdXN5gIaMjIZ/d3Z9hIuNi4R9dnZ9hIuOjIV9dnd+hIuNi4R9dnZ9hYuNi4R9dnZ9hYuNi4R9dnZ9hYuNi4R9dnZ9hYuNjIN8dXV8hIuOjIR9dnZ8hIqNjIR9dnZ9hImMi4R9dnZ9hImMi4N8dXZ9hImMi4N8dXZ9hImMi4N8dXZ9hImMi4N8dXZ9hImLioN8dnd+hImLioN8d3d+g4iKiYJ7dnd+g4iKiYJ7dnd+g4iKiYJ7dnd+g4iKiYJ7dnd+g4iKiYJ7dnd+g4iKiYJ7dnd+g4eJiIF6dnh/g4eJiIF6dnh/g4eJiIF6dnh/g4eJiIF6dnh/g4eJiIF6dnh/g4eJiIF6dnh/goaIh4B5dXl/goaIh4B5dXl/goaIh4B5dXl/goaIh4B5dXl/goaIh4B5dXl/goaIh4B5dXl/goaHhn93dXp/goaHhn93dXp/goaHhn93dXp/goaHhn93dXp/goaHhn93dXp/goaHhn93dXp/gYWGhX52dHt/gYWGhX52dHt/gYWGhX52dHt/gYWGhX52dHt/gYWGhX52dHt/gYWGhX52dHt/gYWGhH10c3t/gYWFhH10c3t/gYWFhH10c3t/gYWFhH10c3t/gYWFhH10c3t/gYWFhH10c3t/gIWFg3xzcnt/gIWFg3xzcnt/gIWFg3xzcnt/gIWFg3xzcnt/gIWFg3xzcnt/gIWFg3xzcnt/gISEgntzc3x/gISEgntzc3x/gISEgntzc3x/gISEgntzc3x/gISEgntzc3x/gISEgntzc3x/gIODgXpyc3x/gIODgXpyc3x/gIODgXpyc3x/gIODgXpyc3x/gIODgXpyc3x/gIODgXpyc3x/f4KCgHlxcnx/f4KCgHlxcnx/f4KCgHlxcnx/f4KCgHlxcnx/f4KCgHlxcnx/f4KCgHlxcnx/f4GBf3hwcXt+f4GBf3hwcXt+f4GBf3hwcXt+f4GBf3hwcXt+f4GBf3hwcXt+f4GBf3hwcXt+foB/fnZvcHp+foB/fnZvcHp+foB/fnZvcHp+foB/fnZvcHp+foB/fnZvcHp+foB/fnZvcHp9fX99dW5weX19fX99dW5weX19fX99dW5weX19fX99dW5weX19fX99dW5weX19fX99dW5weXx8fHx0bW93fHx8fHx0bW93fHx8fHx0bW93fHx8fHx0bW93fHx8fHx0bW93fHx8fHx0bW93e3t6enJsbHZ7e3t6enJsbHZ7e3t6enJsbHZ7e3t6enJsbHZ7e3t6enJsbHZ7e3t6enJsbHZ6enl5cWtrdXp6enl5cWtrdXp6enl5cWtrdXp6enl5cWtrdXp6enl5cWtrdXp6enl5cWtrdXl5eHhwa2p0eXl5eHhwa2p0eXl5eHhwa2p0eXl5eHhwa2p0eXl5eHhwa2p0eXl5eHhwa2p0eHh3d29qanN4eHh3d29qanN4eHh3d29qanN4eHh3d29qanN4eHh3d29qanN4eHh3d29qanN3d3Z2bmlobnN3d3Z2bmlobnN3d3Z2bmlobnN3d3Z2bmlobnN3d3Z2bmlobnN3d3Z2bmlobnJ2dnV1bWhnbXJ2dnV1bWhnbXJ2dnV1bWhnbXJ2dnV1bWhnbXJ2dnV1bWhnbXJ2dnV1bWhnbXF1dXR0bGZmbHF1dXR0bGZmbHF1dXR0bGZmbHF1dXR0bGZmbHF1dXR0bGZmbHF1dXR0bGZmbHB0dHNza2VlanB0dHNza2VlanB0dHNza2VlanB0dHNza2VlanB0dHNza2VlanB0dHNza2VlanBzc3JyamRkaW9zc3JyamRkaW9zc3JyamRkaW9zc3JyamRkaW9zc3JyamRkaW9zc3JyamRkaW9ycnFxaWNjZ29ycnFxaWNjZ29ycnFxaWNjZ29ycnFxaWNjZ29ycnFxaWNjZ29ycnFxaWNjZ25xcXBwZ2JiZm5xcXBwZ2JiZm5xcXBwZ2JiZm5xcXBwZ2JiZm5xcXBwZ2JiZm5xcXBwZ2JiZm1wcG9vZmFhZW1wcG9vZmFhZW1wcG9vZmFhZW1wcG9vZmFhZW1wcG9vZmFhZW1wcG9vZmFhZWxvb25uZWBgZGxvb25uZWBgZGxvb25uZWBgZGxvb25uZWBgZGxvb25uZWBgZGxvb25uZWBgZGtvbm1tZF9fY2tvbm1tZF9fY2tvbm1tZF9fY2tvbm1tZF9fY2tvbm1tZF9fY2tvbm1tZF9fY2pubm1sY15eYmpubm1sY15eYmpubm1sY15eYmpubm1sY15eYmpubm1sY15eYmpubm1sY15eYmltbWxsYl1dYWltbWxsYl1dYWltbWxsYl1dYWltbWxsYl1dYWltbWxsYl1dYWltbWxsYl1dYQ==";

export function useCompletionCelebration() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const celebrate = useCallback(() => {
    // Mobil vibráció (ha támogatott)
    if ("vibrate" in navigator) {
      try {
        // Rövid, kellemes mintázat: rövid-szünet-rövid-szünet-hosszú
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch (e) {
        // Némán hagyjuk, ha nem sikerül
        console.log("Vibration not available:", e);
      }
    }

    // Confetti animáció
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
    });

    // Második hullám kicsit később
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7, x: 0.3 },
      });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7, x: 0.7 },
      });
    }, 300);

    // Hangeffekt lejátszása
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(CELEBRATION_SOUND_URL);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        // Autoplay policy miatt lehet, hogy nem játszik le
        console.log("Could not play celebration sound:", e);
      });
    } catch (e) {
      console.warn("Failed to play celebration sound:", e);
    }
  }, []);

  return { celebrate };
}
