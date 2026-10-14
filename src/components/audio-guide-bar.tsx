// «Послушать VOYZ-гид»: лаймовая плашка 58 px, кнопка play в круге limeSoft, время справа.
// Играет локальный assets/audio/<id>.mp3 — работает без сети.
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Pause, Play } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audioSeconds, audioSource } from '@/data/places';
import { color, type } from '@/theme/tokens';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AudioGuideBar({ placeId }: { placeId: string }) {
  const source = audioSource(placeId);
  if (source == null) return null; // озвучки нет — блок не показываем
  return <Player source={source} total={audioSeconds(placeId)} />;
}

function Player({ source, total }: { source: number; total?: number }) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || total || 0;
  const started = status.currentTime > 0;

  // дослушали — возвращаем в начало, чтобы следующее нажатие играло заново
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (status.playing) player.pause();
    else player.play();
  };

  const progress = duration ? Math.min(1, status.currentTime / duration) : 0;

  return (
    <Pressable
      onPress={toggle}
      style={styles.bar}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Пауза, VOYZ-гид' : 'Послушать VOYZ-гид'}>
      <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      <View style={styles.play}>
        {status.playing ? <Pause size={20} color={color.black} fill={color.black} /> : <Play size={20} color={color.black} fill={color.black} />}
      </View>
      <Text style={styles.label}>Послушать VOYZ-гид</Text>
      <Text style={styles.time}>{started ? `${mmss(status.currentTime)} / ${mmss(duration)}` : mmss(duration)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 58,
    borderRadius: 999,
    backgroundColor: color.lime,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 20,
    gap: 12,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.08)' },
  play: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.limeSoft, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.label, color: color.black, flex: 1 },
  time: { ...type.caption, fontFamily: 'Mulish_600SemiBold', color: color.black, fontVariant: ['tabular-nums'] },
});
