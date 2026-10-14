# Voyz — мобильный путеводитель

Приложение для iOS и Android: 112 мест в Кыргызстане и на Алтае — как доехать, где оставить машину, где ночевать, что важно знать заранее. Работает без интернета, у каждого места есть аудиогид.

Стек: Expo SDK 57, TypeScript, expo-router, Reanimated, zustand + MMKV, expo-audio, expo-image. Подробности и правила — в [CLAUDE.md](CLAUDE.md), план — в [docs/05_ROADMAP.md](docs/05_ROADMAP.md).

## Запуск

```bash
npm install
npm start          # Expo: откройте в Expo Go или dev client (Android/iOS)
npm run web        # веб-версия на http://localhost:8081
npm run prototype  # веб-прототип-эталон на http://localhost:8080
```

MMKV — нативный модуль: на телефоне нужен **dev client** (`npx expo run:android` или `eas build --profile development`), в Expo Go хранилище работать не будет.

## Открыть в браузере

**https://volgintb-arch.github.io/voyz-app/** — без входа и регистрации, ссылку можно отправлять кому угодно. Обновляется сам при каждом пуше в `main`.

В приложении нет авторизации: всё хранится на устройстве.

## Сборка для магазинов (позже, по необходимости)

Нужна только для App Store и Google Play — разработчику (не пользователям) потребуется аккаунт Expo. Для веб-ссылки не нужна.

```bash
npm run build:dev       # dev client — для разработки на своём телефоне
npm run build:preview   # тестовая сборка: Android APK по ссылке, iOS — internal (нужен Apple Developer)
npm run build:prod      # релиз: Google Play (AAB) и App Store
npm run submit:prod     # отправка: Google Play Internal testing и TestFlight
```

Статус шагов и отличия от прототипа — [docs/07_STATUS.md](docs/07_STATUS.md).

## Проверки

```bash
npm run typecheck
npm run lint
```

## Где что лежит

| Папка | Что внутри |
|---|---|
| `src/app/` | экраны (expo-router): онбординг, табы, карточка места |
| `src/components/` | компоненты интерфейса |
| `src/data/` | типы, загрузка мест, фильтры; `media.generated.ts` — таблица фото и mp3 |
| `src/store/` | состояние: страна, избранное, маршрут |
| `src/theme/tokens.ts` | дизайн-токены (из `design/tokens.json`) |
| `assets/data/` | `places.json` (112 мест), `geo.json` (офлайн-карта и граф дорог) |
| `assets/img/` | фото мест (960 px и миниатюры 420 px) |
| `assets/audio/` | аудиогиды `<id>.mp3`, голос ru-RU-DmitryNeural |
| `design/` | токены и эталонные макеты |
| `docs/` | исследование, UX-спецификация, дизайн-система, модель данных, план |
| `reference/` | веб-прототип и его исходники — эталон поведения |
| `tools/` | генератор медиатаблицы, сервер прототипа, скрипты пересборки данных |

После изменений в `assets/img`, `assets/audio` или `places.json` выполните `npm run gen:media`.

## Озвучка

Аудиогиды сделаны нейроголосом Microsoft Edge TTS и подходят только для разработки. Перед коммерческим релизом их нужно заменить лицензированной озвучкой, сохранив имена файлов `<id>.mp3`.
