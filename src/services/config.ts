// Подключение внешних сервисов — только через переменные окружения (см. .env.example и docs/08_BACKEND.md).
// Пока переменные пустые, приложение полностью работает без сервера: отметки копятся в очереди на телефоне.

export const config = {
  /** Базовый адрес REST API (например, https://<project>.supabase.co/rest/v1). Пусто — сервер не подключён. */
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  /** Публичный ключ клиента (Supabase anon key или аналог). Не секрет: он встраивается в любое клиентское приложение. */
  apiKey: process.env.EXPO_PUBLIC_API_KEY ?? '',
  /** Аналитика: 'console' (по умолчанию в разработке), 'none' или имя подключённого адаптера, например 'appmetrica'. */
  analytics: process.env.EXPO_PUBLIC_ANALYTICS ?? (__DEV__ ? 'console' : 'none'),
  /** Ключ аналитики (AppMetrica API key и т. п.). */
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY ?? '',
};

export const backendEnabled = () => !!config.apiUrl;
