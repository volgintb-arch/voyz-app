// Анимация прорисовки линии маршрута (tokens.motion.routeDraw = 1.6 с). При Reduce Motion — сразу целиком.
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

export function useDrawProgress(key: string, enabled = true) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ key, t: reduce || !enabled ? 1 : 0 });
  // новый маршрут — начинаем рисовать заново (производное состояние вместо setState в эффекте)
  if (state.key !== key) setState({ key, t: reduce || !enabled ? 1 : 0 });

  useEffect(() => {
    if (reduce || !enabled) return;
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / motion.routeDraw);
      const eased = 1 - Math.pow(1 - t, 3);
      setState((s) => (s.key === key ? { key, t: eased } : s));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, reduce, enabled]);

  return state.t;
}
