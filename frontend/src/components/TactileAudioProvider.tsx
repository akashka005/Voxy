import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { classifyInteractiveTag, forensicAudio } from '../utils/forensicAudio';

interface TactileAudioContextValue {
  soundEnabled: boolean;
  toggleSound: () => void;
}

const TactileAudioContext = createContext<TactileAudioContextValue>({
  soundEnabled: true,
  toggleSound: () => {},
});

export function useTactileAudio() {
  return useContext(TactileAudioContext);
}

export function TactileAudioProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastTargetRef = useRef<Element | null>(null);

  useEffect(() => {
    forensicAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const unlock = () => {
      forensicAudio.unlock();
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (!forensicAudio.isEnabled()) return;
      const rawTarget = e.target;
      if (!(rawTarget instanceof Element)) return;

      const interactiveEl = rawTarget.closest(
        'button:not(:disabled), a[href], select, .glass-pill, .glass-card',
      );
      if (!interactiveEl) {
        lastTargetRef.current = null;
        return;
      }

      // Skip if pointer moved within the same hovered element
      const related = e.relatedTarget;
      if (
        interactiveEl === lastTargetRef.current ||
        (related instanceof Node && interactiveEl.contains(related))
      ) {
        return;
      }
      lastTargetRef.current = interactiveEl;

      const isButtonOrLink = interactiveEl.matches('button, a[href], select');
      const isGlassPill = interactiveEl.classList.contains('glass-pill');
      const isGlassCard = interactiveEl.classList.contains('glass-card');

      const soundKind = classifyInteractiveTag(
        isButtonOrLink,
        isGlassPill,
        isGlassCard,
      );
      if (soundKind) {
        forensicAudio.play(soundKind);
      }
    };

    const handleClick = (e: MouseEvent) => {
      forensicAudio.unlock();
      if (!forensicAudio.isEnabled()) return;
      const rawTarget = e.target;
      if (!(rawTarget instanceof Element)) return;
      const actionable = rawTarget.closest('button:not(:disabled), a[href], select');
      if (actionable) {
        forensicAudio.play('action-click');
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const toggleSound = () => {
    forensicAudio.unlock();
    setSoundEnabled((prev) => {
      const next = !prev;
      forensicAudio.setEnabled(next);
      if (next) {
        forensicAudio.play('action-click');
      }
      return next;
    });
  };

  return (
    <TactileAudioContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </TactileAudioContext.Provider>
  );
}
