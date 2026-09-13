import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundManager, triggerHaptic } from "@/lib/sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundManager.isEnabled());
  }, []);

  const handleToggle = () => {
    const newState = soundManager.toggle();
    setEnabled(newState);
    triggerHaptic("light");
    if (newState) {
      soundManager.playCorrect();
    }
  };

  return (
    <button
      id="sound-toggle-btn"
      onClick={handleToggle}
      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      title={enabled ? "Mute Sound Effects" : "Enable Sound Effects"}
      aria-label={enabled ? "Mute Sound Effects" : "Enable Sound Effects"}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5 text-indigo-600" />
      ) : (
        <VolumeX className="w-5 h-5 text-slate-400" />
      )}
    </button>
  );
}
