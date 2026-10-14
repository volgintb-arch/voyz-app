// Затемнение снизу поверх фото, чтобы белый текст читался на светлых кадрах.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/** from — где начинается затемнение (0…1 по высоте), to — цвет внизу. */
export function PhotoShade({ from = 0.4, to = 'rgba(0,0,0,.85)' }: { from?: number; to?: string }) {
  return (
    <LinearGradient
      colors={['transparent', to]}
      locations={[from, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
