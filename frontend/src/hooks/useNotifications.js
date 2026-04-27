import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// Beep sound generator using Web Audio API (no external file needed)
function playBeep(frequency = 880, duration = 220, volume = 0.18) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
    setTimeout(() => ctx.close(), duration + 100);
  } catch (e) {
    // Silent fail - audio context may not be available
  }
}

function playChime() {
  playBeep(880, 200);
  setTimeout(() => playBeep(1175, 220), 180);
  setTimeout(() => playBeep(1568, 280), 360);
}

export function useNotificationPolling() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const lastSeenRef = useRef(new Date().toISOString());

  const poll = useCallback(async () => {
    if (!user || !["director", "admin"].includes(user.role)) return;
    try {
      const { data } = await api.get("/notifications", {
        params: { since: lastSeenRef.current },
      });
      if (data && data.length > 0) {
        // newest first - update lastSeen to the newest
        lastSeenRef.current = data[0].created_at;
        const playable = data.filter((n) => n.sound);
        if (playable.length > 0) {
          playChime();
          for (const n of playable) {
            toast(n.title, { description: n.body, duration: 6000 });
          }
        } else {
          for (const n of data) {
            toast(n.title, { description: n.body, duration: 4000 });
          }
        }
        setNotifications((prev) => [...data, ...prev].slice(0, 50));
      }
    } catch (e) {
      // silent
    }
  }, [user]);

  useEffect(() => {
    if (!user || !["director", "admin"].includes(user.role)) return;
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [user, poll]);

  return { notifications, playChime };
}
