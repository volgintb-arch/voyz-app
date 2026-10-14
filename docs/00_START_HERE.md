# Как запустить сборку приложения в Claude Code

1. Распакуйте архив в пустую папку, например `~/projects/voyz-app`, и сделайте её git-репозиторием (`git init`).
2. Установите Node LTS, Xcode (для iOS) и Android Studio (для Android), затем аккаунт Expo: `npm i -g eas-cli && eas login`.
3. Откройте папку в Claude Code (`claude` в терминале) и отправьте первое сообщение:

```
Прочитай CLAUDE.md и все файлы в docs/. Открой design/reference/voyz_place_card_mockup.jpg и скриншоты prototype_*.png.
Создай Expo-проект в этой папке (TypeScript, expo-router) со стеком из CLAUDE.md, перенеси data/ и prototype/img/ в assets/.
Сделай шаги 1–2 из docs/05_ROADMAP.md (каркас, токены, шрифт, логотип, загрузка данных, сторы) и покажи мне результат на iOS-симуляторе.
Дальше иди по шагам MVP, после каждого шага — короткий отчёт и скриншот рядом с прототипом.
```

4. Посмотреть эталон в браузере: `cd prototype && python3 -m http.server 8080` → http://localhost:8080 (в DevTools включите мобильный режим 390×844).
5. Тестовые сборки: `eas build --profile preview --platform all` → TestFlight и Google Play Internal testing.

Что важно проверить в первой сборке: карточка «Каньон Сказка» (`kg-skazka`), маршрут «Телецкое озеро» (`alt-01`), работа в авиарежиме, свайп назад и кнопка «назад» на Android.
