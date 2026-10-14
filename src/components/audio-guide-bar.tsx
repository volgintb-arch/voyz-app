// «Послушать VOYZ-гид»: лаймовая плашка 58 px, кнопка play в круге limeSoft, эквалайзер из 4 полосок,
// прогресс заливкой, перемотка протягиванием. Играет локальный assets/audio/<id>.mp3 (офлайн),
// в фоне и с экрана блокировки; если записи нет — озвучка синтезом речи (expo-speech, ru-RU).
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { audioSeconds, audioSource } from '@/data/places';
import { mmss } from '@/lib/text';
import { color } from '@/theme/tokens';

let modeSet = false;
const ensureAudioMode = () => {
  if (modeSet) return;
  modeSet = true;
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
};

export interface AudioGuideRef {
  play: () => void;
}

interface Props {
  placeId: string;
  title: string;
  text: string; // текст гида — для синтеза речи, если записи нет
}

export const AudioGuideBar = forwardRef<AudioGuideRef, Props>(function AudioGuideBar({ placeId, title, text }, ref) {
  const source = audioSource(placeId);
  if (source != null) return <Recorded ref={ref} source={source} total={audioSeconds(placeId)} title={title} />;
  if (!text) return null;
  return <Spoken ref={ref} text={text} />;
});

const Recorded = forwardRef<AudioGuideRef, { source: number; total?: number; title: string }>(function Recorded({ source, total, title }, ref) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [width, setWidth] = useState(1);
  const duration = status.duration || total || 0;
  const started = status.currentTime > 0.2;

  const toggle = () => {
    ensureAudioMode();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (status.playing) return player.pause();
    player.play();
    try {
      player.setActiveForLockScreen(true, { title, artist: 'VOYZ-гид', albumTitle: 'Voyz' });
    } catch {}
  };
  useImperativeHandle(ref, () => ({ play: () => !status.playing && toggle() }));

  // дослушали — в начало; уходим с экрана — убираем плеер с экрана блокировки
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);
  useEffect(
    () => () => {
      try {
        player.setActiveForLockScreen(false);
      } catch {}
    },
    [player],
  );

  const seek = (x: number) => {
    if (duration) player.seekTo(Math.max(0, Math.min(1, x / width)) * duration);
  };
  const gesture = Gesture.Exclusive(
    Gesture.Pan()
      .activeOffsetX([-12, 12])
      .onUpdate((e) => runOnJS(seek)(e.x)),
    Gesture.Tap().onEnd(() => runOnJS(toggle)()),
  );

  const label = status.playing ? 'VOYZ-гид рассказывает' : started ? 'Пауза — нажмите, чтобы продолжить' : 'Послушать VOYZ-гид';
  const time = started ? mmss(Math.max(0, duration - status.currentTime)) : mmss(duration);
  return (
    <Bar
      gesture={gesture}
      playing={status.playing}
      progress={duration ? status.currentTime / duration : 0}
      label={label}
      time={time}
      onWidth={setWidth}
      a11y={status.playing ? 'Пауза, VOYZ-гид' : 'Послушать VOYZ-гид'}
    />
  );
});

const Spoken = forwardRef<AudioGuideRef, { text: string }>(function Spoken({ text }, ref) {
  const [playing, setPlaying] = useState(false);
  const est = Math.round(text.split(/\s+/).length / 2.3);
  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playing) {
      Speech.stop();
      return setPlaying(false);
    }
    setPlaying(true);
    Speech.speak(text, { language: 'ru-RU', onDone: () => setPlaying(false), onStopped: () => setPlaying(false), onError: () => setPlaying(false) });
  };
  useImperativeHandle(ref, () => ({ play: () => !playing && toggle() }));
  useEffect(() => () => void Speech.stop(), []);
  const gesture = Gesture.Tap().onEnd(() => runOnJS(toggle)());
  return <Bar gesture={gesture} playing={playing} progress={0} label={playing ? 'VOYZ-гид рассказывает' : 'Послушать VOYZ-гид'} time={mmss(est)} a11y="Послушать VOYZ-гид" />;
});

function Bar({ gesture, playing, progress, label, time, onWidth, a11y }: { gesture: ReturnType<typeof Gesture.Tap> | ReturnType<typeof Gesture.Exclusive>; playing: boolean; progress: number; label: string; time: string; onWidth?: (w: number) => void; a11y: string }) {
  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.bar} onLayout={(e) => onWidth?.(e.nativeEvent.layout.width)} accessible accessibilityRole="button" accessibilityLabel={a11y}>
        <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
        <View style={styles.play}>
          <Icon name={playing ? 'pause' : 'play'} size={18} color={color.black} fill={color.black} strokeWidth={0} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {playing ? <Equalizer /> : null}
        <Text style={styles.time}>{time}</Text>
      </View>
    </GestureDetector>
  );
}

function Equalizer() {
  return (
    <View style={styles.eq}>
      {[0, 1, 2, 3].map((i) => (
        <EqBar key={i} i={i} />
      ))}
    </View>
  );
}
function EqBar({ i }: { i: number }) {
  const reduce = useReducedMotion();
  const h = useSharedValue(0.4);
  useEffect(() => {
    if (!reduce) h.set(withRepeat(withTiming(1, { duration: 360 + i * 110 }), -1, true));
  }, [reduce, h, i]);
  const st = useAnimatedStyle(() => ({ height: 4 + h.value * 12 }), [h]);
  return <Animated.View style={[styles.eqBar, st]} />;
}

const styles = StyleSheet.create({
  bar: { height: 58, borderRadius: 999, backgroundColor: color.lime, flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 22, gap: 14, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.08)' },
  play: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.limeSoft, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Mulish_500Medium', fontSize: 15, color: color.black, flex: 1 },
  time: { fontFamily: 'Mulish_600SemiBold', fontSize: 13, color: color.black, fontVariant: ['tabular-nums'] },
  eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 },
  eqBar: { width: 3, borderRadius: 2, backgroundColor: color.black },
});
