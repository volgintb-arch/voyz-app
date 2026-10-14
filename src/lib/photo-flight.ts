// «Фото летит в карточку»: карточка в списке запоминает, где на экране её фото, экран места
// рисует это фото поверх и растягивает его в hero. Своя реализация вместо shared transitions
// Reanimated 4 (экспериментальные и не работают в вебе) — одинаково на iOS, Android и в вебе.
import { Platform, type View } from 'react-native';

export interface FlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // скругление исходного фото
}

let pending: { id: string; rect: FlightRect; at: number } | null = null;
const TTL = 1500; // нажали и не перешли (прокрутка, отмена) — полёт протухает

export const setFlight = (id: string, rect: FlightRect) => {
  pending = { id, rect, at: Date.now() };
};

const fresh = (id: string) => !!pending && pending.id === id && Date.now() - pending.at < TTL;

/** Есть ли полёт к этому месту (для выбора анимации экрана). */
export const hasFlight = (id?: string) => !!id && fresh(id);

/** Полёт для открываемого экрана места. Не обнуляем: в StrictMode инициализатор состояния вызывается дважды,
 *  а повтор не страшен — запись живёт TTL и перетирается следующим нажатием. */
export const takeFlight = (id: string): FlightRect | null => (fresh(id) ? pending!.rect : null);

/** Положение элемента в окне. В вебе measureInWindow отвечает асинхронно — уже после перехода, когда карточки
 *  нет и размеры нулевые, поэтому там берём getBoundingClientRect синхронно. */
export function measureWin(node: View | null, cb: (x: number, y: number, w: number, h: number) => void) {
  if (!node) return;
  if (Platform.OS === 'web') {
    const r = (node as unknown as HTMLElement).getBoundingClientRect?.();
    if (r) cb(r.left, r.top, r.width, r.height);
    return;
  }
  node.measureInWindow(cb);
}
