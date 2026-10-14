# Liquid Glass (iOS 26) в Voyz

## Принцип
Стекло — это **слой навигации и управления**, который плавает над контентом. Контент (фото, тексты, карты, карточки мест) стеклом не делаем. Фирменный стиль Voyz (чёрный, лайм, белый лист) остаётся: стекло его подсвечивает, а не заменяет.

| Элемент | Вариант стекла | Тинт | Интерактивность |
|---|---|---|---|
| Таб-бар (плавающая капсула) | regular | тёмный (≈ #0E0E0E, 74 %) | да |
| Индикатор активного таба | regular | лайм `#D8FC00` («линза»: тянется при переезде) | — |
| Кнопки над hero: назад; поделиться и сердце **одной капсулой** (union) | clear | нет | да |
| Компактная шапка карточки | regular | тёмная над чёрным, светлая над белым | — |
| Карта: поиск, кнопки «показать всё», «где я», «слои» | regular | светлый | да |
| FAB «+» на карте маршрута, «Найти тур» | regular, prominent | лайм | да |
| Шторки (фильтры, туры), тосты | regular | светлый (шторка) / тёмный (тост) | — |
| Плашка рейтинга и точки галереи на hero | clear | светлый | — |

**Не стеклом:** карточки мест в списках, блок «Важно», лаймовые карточки «Хочешь сюда?» и «Заметили изменения?», сетка 2×2 — у них свой фирменный фон.

## Реализация в Expo / React Native
```sh
npx expo install expo-glass-effect expo-blur
```
- `GlassView` — props `glassEffectStyle` (`'regular' | 'clear' | 'none'` или `{ style, animate, animationDuration }`), `tintColor`, `isInteractive`, `colorScheme`.
- `GlassContainer` — prop `spacing`; объединяет соседние стёкла и даёт им «перетекать» друг в друга (кнопки «поделиться» и «сердце», чипсы карты).
- `isLiquidGlassAvailable()` и `isGlassEffectAPIAvailable()` — проверки перед рендером: на части бета-версий iOS 26 API нет, и рендер может упасть.
- **Фолбэк** (Android, iOS < 26, включено «Понижение прозрачности»): `expo-blur` `BlurView` (intensity 40–60, tint dark/light) + полупрозрачный фон + `LinearGradient` для блика сверху и рамка 1 px rgba(255,255,255,.2). Проверка: `AccessibilityInfo.isReduceTransparencyEnabled()`.
- Ограничение: если поставить `opacity: 0` на GlassView или его родителя, стекло пропадёт. Прятать таб-бар нужно сдвигом (`translateY`), а появление делать через `glassEffectStyle: { style, animate: true }`.

```tsx
// src/components/Glass.tsx
import { GlassView, GlassContainer, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { AccessibilityInfo, Platform, View, ViewProps } from 'react-native';

const native = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export function Glass({ tint, clear, interactive, dark, style, children, ...p }: ViewProps & { tint?: string; clear?: boolean; interactive?: boolean; dark?: boolean }) {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => { AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce); }, []);
  if (native && !reduce) return <GlassView glassEffectStyle={clear ? 'clear' : 'regular'} tintColor={tint} isInteractive={interactive} colorScheme={dark ? 'dark' : 'auto'} style={style} {...p}>{children}</GlassView>;
  if (reduce) return <View style={[style, { backgroundColor: dark ? '#141414' : '#FFFFFF' }]} {...p}>{children}</View>;
  return <BlurView intensity={50} tint={dark ? 'dark' : 'light'} style={[style, { overflow: 'hidden', backgroundColor: tint ?? (dark ? 'rgba(14,14,14,.55)' : 'rgba(255,255,255,.45)'), borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' }]} {...p}>{children}</BlurView>;
}
export { GlassContainer };
```

## Нативный таб-бар
В expo-router на iOS 26 можно использовать **нативные табы** (`expo-router/unstable-native-tabs`, если доступны в вашей версии SDK). Они сами получают системное стекло и сворачиваются при скролле. Если нужен фирменный лаймовый индикатор, делайте свой таб-бар на `GlassView` с индикатором на Reanimated: при переезде он вытягивается `scaleX 1.28 / scaleY .86` и возвращается на пружине (как в прототипе, `moveInd(true)`).

## Если будет нативный SwiftUI-клиент
`.glassEffect(.regular.tint(.black.opacity(0.7)).interactive(), in: .capsule)` для таб-бара; кнопки hero в `GlassEffectContainer(spacing: 8)` с `.glassEffectUnion(id: "actions", namespace:)`; FAB — `.buttonStyle(.glassProminent)` с `.tint(Color(hex: 0xD8FC00))`; морфинг FAB «+» → «✓» через `.glassEffectID`.

## Проверка
Светлая и тёмная тема, «Понижение прозрачности», «Увеличение контраста», Android-фолбэк. Текст на стекле должен проходить контраст AA. Стекло над стеклом не кладём.

## Веб-эмуляция v2 (прототип) — как добиться вида iOS 26
- **Мало тинта, мало блюра, много насыщенности:** фон rgba(255,255,255,.10–.45), blur 6–12 px, saturate 190 %, brightness 1.06. Старый «матовый» блюр 20–30 px — это не Liquid Glass.
- **Двойной блик по краю:** `inset 1.5px 1.5px 0 -.5px rgba(255,255,255,.95)` (свет сверху слева) + `inset -1px -1px 0 -.5px rgba(255,255,255,.55)` (снизу справа) + волосяная обводка .5 px + внутреннее свечение 14 px.
- **Преломление по краям:** SVG-фильтр `feDisplacementMap` по карте-градиенту, `backdrop-filter: url(#lg-refract)`. Работает только в Chromium; в Safari и WebKit остаются блики и блюр.
- **Навигация без плашки:** круглая стеклянная кнопка «назад», капсула с названием, капсула разделов и scroll-edge-эффект (размытая маска сверху) вместо сплошного хедера.
- **Таб-бар:** светлая стеклянная капсула; выбранный таб — лаймовая стеклянная «капля». При нажатии и протягивании капля увеличивается как линза и едет за пальцем, при отпускании выбирает таб.
- **Шторки** парят с отступом 8 px и радиусом 38; у ридера фон почти непрозрачный, чтобы текст читался.
- В нативном приложении всё это даёт `GlassView` — эмуляция нужна только для прототипа.
