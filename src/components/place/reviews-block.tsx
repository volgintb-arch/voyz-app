// Отзывы путешественников: одобренные модератором (с сервера) + свои — со статусом «на проверке».
// Писать можно без сети и без подключённого сервера: отзыв ждёт в очереди и уходит сам (src/services/backend.ts).
// Правило данных: фейковые отзывы не рисуем — пока сервера нет, показываем только свои.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Button, SectionHeader } from '@/components/ui';
import type { Place } from '@/data/types';
import { backendEnabled } from '@/services/config';
import { fetchReviews, flushReviews, type Review } from '@/services/backend';
import { toast, useApp, type MyReview } from '@/store/app-store';
import { color, spacing, type } from '@/theme/tokens';
import { currentLang, dateLabel, pl, tr } from '@/i18n';

const MIN = 20;
const MAX = 1000;
type Stars = 1 | 2 | 3 | 4 | 5;

export function ReviewsBlock({ place }: { place: Place }) {
  const mine = useApp((s) => s.myReviews).filter((r) => r.id === place.id);
  const removeReview = useApp((s) => s.removeReview);
  const [server, setServer] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!backendEnabled()) return;
    let alive = true;
    fetchReviews(place.id).then((r) => alive && setServer(r));
    return () => {
      alive = false;
    };
  }, [place.id]);

  const all = server.length;
  const avg = all ? server.reduce((s, r) => s + r.rating, 0) / all : 0;

  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Отзывы путешественников')} />
      {all ? (
        <View style={styles.sum}>
          <Text style={styles.sumV}>{avg.toFixed(1)}</Text>
          <StarsRow value={Math.round(avg)} size={18} />
          <Text style={styles.sumL}>
            {all} {pl(all, 'отзыв', 'отзыва', 'отзывов')}
          </Text>
        </View>
      ) : null}

      {mine.map((r) => (
        <MyReviewCard key={r.cid} r={r} onDelete={() => removeReview(r.cid)} />
      ))}
      {server.slice(0, 5).map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.author}>{r.author || tr('Путешественник')}</Text>
            <Text style={styles.date}>{dateLabel(r.createdAt)}</Text>
          </View>
          <StarsRow value={r.rating} size={15} />
          <Text style={styles.text}>{r.text}</Text>
        </View>
      ))}

      {!all && !mine.length ? (
        <Text style={styles.empty}>{tr('Пока нет отзывов. Были здесь? Расскажите, как всё прошло — это поможет следующим.')}</Text>
      ) : null}

      <Button label={tr('Оставить отзыв')} icon="star" tone="black" onPress={() => setOpen(true)} style={{ marginTop: 14 }} />
      <ReviewSheet place={place} visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function MyReviewCard({ r, onDelete }: { r: MyReview; onDelete: () => void }) {
  const status = r.sent ? tr('На проверке у редакции') : backendEnabled() ? tr('Ждёт отправки — уйдёт, когда появится сеть') : tr('Сохранён на телефоне — отправим, когда подключим отзывы');
  return (
    <View style={[styles.card, styles.mine]}>
      <View style={styles.cardTop}>
        <Text style={styles.author}>{tr('Ваш отзыв')}</Text>
        <Text style={styles.date}>{dateLabel(r.at)}</Text>
      </View>
      <StarsRow value={r.rating} size={15} />
      <Text style={styles.text}>{r.text}</Text>
      <View style={styles.statusRow}>
        <Icon name={r.sent ? 'check' : 'timer'} size={14} color={color.muted} />
        <Text style={styles.status}>{status}</Text>
        {!r.sent ? (
          <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Удалить отзыв')}>
            <Text style={styles.del}>{tr('Удалить')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function StarsRow({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: Stars) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 10 : 2 }}>
      {([1, 2, 3, 4, 5] as Stars[]).map((i) => {
        const star = <Icon name="star" size={size} color={i <= value ? color.black : '#C9C9C4'} fill={i <= value ? color.lime : 'none'} strokeWidth={1.5} />;
        return onChange ? (
          <Pressable key={i} onPress={() => onChange(i)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ checked: i === value }} accessibilityLabel={tr('{n} из 5', { n: i })}>
            {star}
          </Pressable>
        ) : (
          <View key={i}>{star}</View>
        );
      })}
    </View>
  );
}

const RATING_HINT = ['', 'Не понравилось', 'Так себе', 'Нормально', 'Хорошо', 'Отлично'];

function ReviewSheet({ place, visible, onClose }: { place: Place; visible: boolean; onClose: () => void }) {
  const add = useApp((s) => s.addReview);
  const [rating, setRating] = useState<Stars | 0>(0);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const len = text.trim().length;

  const send = () => {
    if (!rating) return toast(tr('Поставьте оценку'), 'star');
    if (len < MIN) return toast(tr('Напишите чуть подробнее — хотя бы {n} символов', { n: MIN }), 'info');
    add({ id: place.id, rating, text: text.trim(), author: author.trim() || undefined, lang: currentLang() });
    flushReviews();
    setRating(0);
    setText('');
    onClose();
    toast(tr('Спасибо! Отзыв появится после проверки'), 'check');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={tr('Ваш отзыв')} tall footer={<Button label={tr('Отправить')} tone="black" onPress={send} />}>
      <Text style={styles.place}>{place.name}</Text>
      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <StarsRow value={rating} size={34} onChange={setRating} />
        <Text style={styles.hint}>{rating ? tr(RATING_HINT[rating]) : tr('Как вам место?')}</Text>
      </View>
      <Text style={styles.label}>{tr('Что понравилось, что стоит знать другим')}</Text>
      <TextInput
        value={text}
        onChangeText={(v) => setText(v.slice(0, MAX))}
        multiline
        placeholder={tr('Дорога, парковка, толпы, погода, где поесть…')}
        placeholderTextColor={color.muted}
        style={[styles.input, styles.area]}
        accessibilityLabel={tr('Текст отзыва')}
        textAlignVertical="top"
      />
      <Text style={styles.count}>
        {len < MIN ? tr('Ещё {n}', { n: MIN - len }) : ''} {len}/{MAX}
      </Text>
      <Text style={styles.label}>{tr('Имя для подписи (необязательно)')}</Text>
      <TextInput value={author} onChangeText={(v) => setAuthor(v.slice(0, 60))} placeholder={tr('Например, Аня из Новосибирска')} placeholderTextColor={color.muted} style={styles.input} accessibilityLabel={tr('Имя для подписи')} />
      <View style={styles.rules}>
        <Icon name="shield" size={16} color={color.muted} />
        <Text style={styles.rulesT}>{tr('Отзывы читает редакция: публикуем личный опыт, без рекламы, оскорблений и телефонов. Обычно — в течение пары дней.')}</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sec: { paddingHorizontal: spacing.screenGutter, paddingTop: spacing.sectionGap },
  sum: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 },
  sumV: { fontFamily: 'Mulish_800ExtraBold', fontSize: 28, color: color.black },
  sumL: { fontFamily: 'Mulish_500Medium', fontSize: 14, color: color.muted },
  card: { borderWidth: 1.5, borderColor: color.line, borderRadius: 22, padding: 14, marginBottom: 10, gap: 6 },
  mine: { borderColor: color.limeLine, backgroundColor: '#FBFFE9' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  author: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black },
  date: { ...type.caption, fontSize: 12.5, color: color.muted },
  text: { fontFamily: 'Mulish_400Regular', fontSize: 14.5, lineHeight: 21, color: '#262624' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  status: { flex: 1, ...type.caption, fontSize: 12.5, color: color.muted },
  del: { fontFamily: 'Mulish_600SemiBold', fontSize: 12.5, color: color.black, textDecorationLine: 'underline' },
  empty: { fontFamily: 'Mulish_400Regular', fontSize: 15, lineHeight: 22, color: '#262624', textAlign: 'center', paddingHorizontal: 10 },
  place: { fontFamily: 'Mulish_700Bold', fontSize: 17, color: color.black, textAlign: 'center' },
  hint: { fontFamily: 'Mulish_600SemiBold', fontSize: 14, color: color.muted, marginTop: 8 },
  label: { fontFamily: 'Mulish_600SemiBold', fontSize: 14, color: color.black, marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: color.mist, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Mulish_400Regular', fontSize: 15.5, color: color.black },
  area: { minHeight: 130 },
  count: { ...type.caption, fontSize: 12, color: color.muted, textAlign: 'right', marginTop: 4 },
  rules: { flexDirection: 'row', gap: 8, marginTop: 18, alignItems: 'flex-start' },
  rulesT: { flex: 1, ...type.caption, fontSize: 12.5, lineHeight: 18, color: color.muted },
});
