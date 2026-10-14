# Voyz — мобильное приложение-путеводитель (iOS + Android)

Ты собираешь нативное приложение Voyz по готовому веб-прототипу и спецификации из этого репозитория. Язык интерфейса — русский.

## Язык общения — всегда русский
Все ответы, отчёты, пояснения и вопросы пользователю — **только на русском**. Комментарии в коде и сообщения коммитов — тоже по-русски. Имена в коде, команды и пути остаются как есть.

## Что здесь лежит
- `reference/prototype/` — **рабочий эталон поведения** (HTML, JS, Leaflet). Запуск: `npm run prototype` → http://localhost:8080, открыть в мобильном вьюпорте 390×844. Перед реализацией каждого экрана сверяйся с ним. Фото прототип берёт из `assets/img/`.
- `reference/prototype_src/app.js`, `style.css` — исходники прототипа: логика подборок, фильтров, разбора сезона, маршрутизации (Дейкстра), разметка всех блоков.
- `design/reference/voyz_place_card_mockup.jpg` — **фирменный макет карточки места**, главный визуальный эталон. Кадры `voyz_scroll_video_frames_*.png` показывают, как белый лист наезжает на чёрный блок при скролле.
- `design/tokens.json` — цвета, типографика, радиусы, тайминги анимаций. В коде — `src/theme/tokens.ts`.
- `docs/00_START_HERE.md` — исходная инструкция кита; `01_RESEARCH.md` — рынок; `02_UX_SPEC.md` — экраны и поведение; `03_DESIGN_SYSTEM.md` — компоненты; `04_DATA_MODEL.md` — схема данных; `05_ROADMAP.md` — этапы; `06_LIQUID_GLASS.md` — где и как применяем Liquid Glass.
- `assets/data/places.json` (112 мест), `assets/data/geo.json` (офлайн-карта и граф дорог), фото — `assets/img/` (`<id>.jpg` 960 px, `t_<id>.jpg` 420 px).
- `assets/audio/<id>.mp3` — **аудиогиды на все 112 мест** (нейроголос `ru-RU-DmitryNeural`, Microsoft Edge TTS). Длительности — `reference/prototype/data/audio.js`.
- `docs/08_BACKEND.md` — как подключить сервер (Supabase) и аналитику; слой — `src/services/`, схема БД — `supabase/schema.sql`.
- `tools/data-scripts/` — Python-скрипты, которые сгенерировали данные (для пересборки).

## Стек (бери актуальные стабильные версии на момент сборки)
- Expo (managed + dev client), TypeScript strict, **expo-router** (табы и стек), роуты лежат в `src/app/`.
- **react-native-reanimated** + **react-native-gesture-handler** — все анимации и жесты; shared element — через Reanimated (`sharedTransitionTag`) или ручной overlay, если API нестабилен.
- **expo-glass-effect** (GlassView/GlassContainer, iOS 26 Liquid Glass) + фолбэк **expo-blur** — весь слой навигации, см. `docs/06_LIQUID_GLASS.md`.
- **@gorhom/bottom-sheet** — шторки; **expo-image** — фото с кэшем; **expo-linear-gradient**, **expo-blur** — стеклянные кнопки и градиенты.
- **@maplibre/maplibre-react-native** — карты. Базовый слой — GeoJSON из `assets/data/geo.json`, оформленный по `tokens.color.map*`. Онлайн-тайлы — опциональный слой.
- **zustand** + **react-native-mmkv** — состояние (страна, избранное, маршрут, очередь отметок).
- **expo-audio** — аудиогид из локальных `assets/audio/*.mp3` (фон и экран блокировки); **expo-speech** — запасной вариант. **expo-haptics**; **expo-linking** — deep links; **expo-location** — «где я».
- **@expo-google-fonts/mulish**, **react-native-svg** (логотип VOYZ — SVG-пути из `reference/prototype_src/app.js → WM`).
- Сборка — **EAS Build** (profiles: development, preview, production).

## Структура проекта
```
src/app/_layout.tsx               # корневой стек, шрифты, сплэш
src/app/(tabs)/index.tsx | map.tsx | trip.tsx | more.tsx
src/app/place/[id].tsx            # карточка
src/app/onboarding.tsx            # выбор страны
src/components/…                  # см. таблицу в docs/03_DESIGN_SYSTEM.md
src/data/places.ts                # загрузка и индексы, catShort, noCar, фильтры
src/data/media.ts                 # карты require() для фото и mp3
src/geo/routing.ts                # Дейкстра + ближайший узел (порт roadRoute)
src/theme/tokens.ts               # из design/tokens.json
src/store/*.ts
assets/data/ · assets/img/ · assets/audio/
```

## Правила
1. **Карточка места — как в макете:** порядок блоков из `docs/02_UX_SPEC.md`, шрифт, капс, радиусы, чёрное → белое. Не упрощай.
2. **Ничего не выдумывай в данных.** Нет отзывов — не рисуй фейковые; рейтинг только из `rating`. Нет фото — hero с картой места.
3. **Офлайн по умолчанию:** приложение полностью работает в авиарежиме (кроме онлайн-тайлов и внешних ссылок). Аудиогиды тоже лежат локально.
4. **Liquid Glass** — только на навигации и контролах (таблица в `docs/06_LIQUID_GLASS.md`), с фолбэком и уважением «Понижения прозрачности».
5. **Анимации** — по `tokens.motion`, обязательно уважать Reduce Motion.
6. **Производительность:** списки — FlashList; фото — миниатюры в списках, крупные только в hero и просмотрщике; карта маршрута создаётся лениво при появлении на экране.
7. **Доступность:** accessibilityLabel у кнопок-иконок, зоны нажатия ≥44, поддержка Dynamic Type.
8. Android: системная кнопка «назад» закрывает просмотрщик, потом шторку, потом карточку. iOS: свайп от края.
9. После каждого экрана: `npx tsc --noEmit`, `npx expo lint`, прогон в Expo (Android-эмулятор или телефон через Expo Go / dev client; разработка ведётся на Windows, iOS-симулятора нет — iOS проверяем на устройстве и через EAS), скриншот для сравнения с прототипом.
10. **Озвучка Edge TTS — для разработки.** Для коммерческого релиза нужна лицензированная озвучка (см. `docs/05_ROADMAP.md`); имена файлов `<id>.mp3` сохраняем, чтобы замена была простой.

## Порядок работы
Иди по `docs/05_ROADMAP.md → MVP` по шагам. Каждый шаг заканчивай работающей сборкой и коротким отчётом: что сделано и чем отличается от прототипа.
