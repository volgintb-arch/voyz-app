// Текст с выделенными числами (км, ч, сом, ₽…) и кликабельными ссылками/телефонами.
import * as Linking from 'expo-linking';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { richSegments, shortUrl, telHref } from '@/lib/text';
import { fontFamily } from '@/theme/tokens';

interface Props extends TextProps {
  children: string;
  numbers?: boolean;
  linkColor?: string;
  numStyle?: TextStyle;
}

export function RichText({ children, numbers = true, linkColor, numStyle, style, ...rest }: Props) {
  const segs = richSegments(children, numbers);
  return (
    <Text style={style} {...rest}>
      {segs.map((s, i) =>
        s.kind === 'num' ? (
          <Text key={i} style={[{ fontFamily: fontFamily[700] }, numStyle]}>
            {s.t}
          </Text>
        ) : s.kind === 'url' || s.kind === 'tel' ? (
          <Text
            key={i}
            accessibilityRole="link"
            onPress={() => Linking.openURL(s.kind === 'tel' ? telHref(s.t) : s.t)}
            style={{ textDecorationLine: 'underline', color: linkColor }}>
            {s.kind === 'url' ? shortUrl(s.t) : s.t}
          </Text>
        ) : (
          s.t
        ),
      )}
    </Text>
  );
}
