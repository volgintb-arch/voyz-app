// Снимок вью в PNG и системное «Поделиться» (Instagram, Telegram, VK, WhatsApp…).
// В вебе — Web Share API с файлом, а если браузер не умеет — скачивание картинки.
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export async function shareViewAsImage(ref: RefObject<View | null>, fileName: string, title: string): Promise<boolean> {
  if (!ref.current) return false;
  if (Platform.OS === 'web') {
    const dataUri = await captureRef(ref, { format: 'png', quality: 1, result: 'data-uri' });
    const blob = await (await fetch(dataUri)).blob();
    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
    const nav = globalThis.navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title });
      return true;
    }
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = `${fileName}.png`;
    a.click();
    return true;
  }
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
  return true;
}
