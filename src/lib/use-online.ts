// Есть ли интернет: от этого зависит, догружать ли подробные онлайн-слои карты поверх встроенных офлайн-данных.
import { useNetworkState } from 'expo-network';

export function useOnline() {
  const s = useNetworkState();
  // пока состояние неизвестно (первый кадр) — считаем, что сеть есть: онлайн-слой просто не догрузится без неё
  return s.isConnected !== false && s.isInternetReachable !== false;
}
