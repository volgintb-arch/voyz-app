// Нижние блоки карточки (docs/02_UX_SPEC.md → 2): «Хочешь сюда?», «Когда ехать», «Лучше взять с собой»,
// «Важно», ночлег, еда, тропы, «Полезное», «Рядом», проверка и источники, «Заметили изменения?», футер.
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { RowPlaceCard } from '@/components/place-cards';
import { RichText } from '@/components/rich-text';
import { Sheet } from '@/components/sheet';
import { Button, Chip, IconBubble, IndexRing, ReadMore, SectionHeader } from '@/components/ui';
import { VoyzLogo } from '@/components/voyz-logo';
import { catLabel, getPlace, placesOf } from '@/data/places';
import type { Place } from '@/data/types';
import { bringIcon } from '@/lib/icon-rules';
import { cut, findTel, findUrl, fmtKm, lead, sentences, telHref } from '@/lib/text';
import { track } from '@/services/analytics';
import { flushReports } from '@/services/backend';
import { toast, useApp } from '@/store/app-store';
import { color, motion, spacing, type } from '@/theme/tokens';
import { currentLang, dateLabel, pl, tr, whenLabel } from '@/i18n';

import type { Reader, ReaderKey } from './readers';
import { warnText } from './readers';

const MSHORT_RU = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'];
const MSHORT_EN = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function WantCard({ place }: { place: Place }) {
  const inTrip = useApp((s) => s.trip.includes(place.id));
  const toggleTrip = useApp((s) => s.toggleTrip);
  const [tours, setTours] = useState(false);
  const been = useApp((s) => s.visited[place.id]);
  const toggleVisited = useApp((s) => s.toggleVisited);
  return (
    <View style={styles.want}>
      <LinearGradient colors={[color.lime, color.lime, '#F5FFC8']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.wantHd}>
        <IconBubble name="mountain" bg={color.paper} />
        <Text style={styles.wantH}>{tr('Хочешь сюда?')}</Text>
      </LinearGradient>
      <Text style={styles.wantP}>{tr('Посмотрите туры и трансферы или добавьте место в свой маршрут.')}</Text>
      <View style={{ gap: 10, paddingHorizontal: 16 }}>
        <Button label={tr('Туры и трансферы')} onPress={() => setTours(true)} />
        <Button
          label={inTrip ? tr('Уже в маршруте ✓') : tr('Добавить в маршрут')}
          tone="grey"
          onPress={() => {
            const added = toggleTrip(place.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            toast(added ? tr('Добавили в маршрут') : tr('Убрали из маршрута'), 'route');
          }}
        />
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
        <Button
          label={been ? tr('Вы были здесь · {date}', { date: dateLabel(been) }) : tr('Я здесь был')}
          icon={been ? 'check' : 'flag'}
          tone={been ? 'black' : 'outline'}
          onPress={() => {
            const on = toggleVisited(place.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            toast(on ? tr('Отметили на вашей карте путешествий') : tr('Отметку сняли'), 'flag');
          }}
        />
      </View>
      <ToursSheet place={place} visible={tours} onClose={() => setTours(false)} />
    </View>
  );
}

function ToursSheet({ place, visible, onClose }: { place: Place; visible: boolean; onClose: () => void }) {
  // в MVP — туры и трансферы из открытых данных места; в проде — каталог Voyz
  const T = (place.p.transport || []).filter((t) => /тур|экскурс|трансфер|водител|гид/i.test(t.mode || ''));
  return (
    <Sheet visible={visible} onClose={onClose} title={tr('Туры и трансферы')}>
      {T.length ? (
        T.map((t, i) => {
          const ct = String(t.contact || '');
          const url = findUrl(ct) || (/^https?:/.test(t.src || '') ? t.src : '');
          const tel = findTel(ct);
          return (
            <View key={i} style={styles.iti}>
              <Text style={styles.itiB}>{t.provider || t.mode}</Text>
              <RichText style={styles.itiP}>{`${t.mode} · ${cut(t.details, 160)}`}</RichText>
              {t.price ? <Text style={[styles.itiP, { fontFamily: 'Mulish_700Bold' }]}>{t.price}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {tel ? <Chip small tone="lime" icon="phone" label={tr('Позвонить')} onPress={() => Linking.openURL(telHref(tel))} /> : null}
                {url ? <Chip small icon="ext" label={tr('Открыть')} onPress={() => Linking.openURL(url)} /> : null}
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.empty}>
          <IconBubble name="tour" />
          <Text style={styles.emptyB}>{tr('Туров пока не нашли')}</Text>
          <Text style={styles.small}>{tr('Ниже в карточке — как добраться самостоятельно.')}</Text>
        </View>
      )}
      <Text style={[styles.small, { marginTop: 8 }]}>{tr('Цены и наличие уточняйте у организатора — данные из открытых источников.')}</Text>
    </Sheet>
  );
}

export function SeasonBlock({ place, onRead }: { place: Place; onRead: () => void }) {
  const cur = new Date().getMonth() + 1;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Когда ехать')} />
      {place.m.length ? (
        <View style={styles.months} accessibilityLabel={tr('Сезон: {month}', { month: whenLabel(place.s.when) })}>
          {(currentLang() === 'en' ? MSHORT_EN : MSHORT_RU).map((m, i) => {
            const on = place.m.includes(i + 1);
            return (
              <View key={i} style={[styles.month, on && { backgroundColor: color.lime }, i + 1 === cur && styles.monthNow]}>
                <Text style={[styles.monthT, on && { color: color.black }]}>{m}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <RichText style={styles.lead2}>{lead(place.p.season || place.when, 1)}</RichText>
      <ReadMore label={tr('Сезон, время суток, режим работы')} onPress={onRead} />
    </View>
  );
}

export function BringBlock({ place }: { place: Place }) {
  const items = String(place.bring || '')
    .split(/[,;]\s+(?![^()]*\))/)
    .map((s) => s.replace(/\(.*?\)/g, '').trim().replace(/[.;]+$/, ''))
    .filter((s) => s && s.length < 40)
    .slice(0, 8);
  if (!items.length) return null;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Лучше взять с собой')} />
      <View style={styles.chips}>
        {items.map((t) => (
          <Chip key={t} icon={bringIcon(t)} label={t.charAt(0).toUpperCase() + t.slice(1)} />
        ))}
      </View>
    </View>
  );
}

export function ImportantBlock({ place, onRead }: { place: Place; onRead: () => void }) {
  const items = sentences(warnText(place));
  if (!items.length) return null;
  return (
    <View style={styles.important}>
      <View style={styles.impH}>
        <Icon name="warn" size={22} color={color.lime} />
        <Text style={styles.impHT}>{tr('Важно')}</Text>
      </View>
      {items.slice(0, 3).map((t, i) => (
        <RichText key={i} style={styles.impP} numStyle={{ color: color.lime }} linkColor={color.lime}>
          {cut(t, 160)}
        </RichText>
      ))}
      {items.length > 3 ? (
        <View style={{ alignItems: 'center' }}>
          <ReadMore light label={tr('Ещё {n} {items}', { n: items.length - 3, items: pl(items.length - 3, 'пункт', 'пункта', 'пунктов') })} onPress={onRead} />
        </View>
      ) : null}
    </View>
  );
}

export function StaysBlock({ place, onRead }: { place: Place; onRead: () => void }) {
  const st = place.p.stays || [];
  if (!st.length && !place.stay) return null;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Где остановиться')} />
      {!st.length ? (
        <RichText style={styles.lead2}>{lead(place.stay, 2)}</RichText>
      ) : (
        <FlatList
          horizontal
          data={st}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.screenGutter }}
          contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: 10 }}
          renderItem={({ item: s }) => {
            const ct = String(s.contact || '');
            const tel = findTel(ct);
            const url = findUrl(ct) || (/^https?:/.test(s.src || '') ? s.src : '');
            return (
              <View style={styles.tcard}>
                <View style={styles.tile}>
                  <Icon name={/юрт|палат|кемп|лагер/i.test(s.type || '') ? 'tent' : 'bed'} size={30} color={color.lime} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.tcardB} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={styles.tcardS} numberOfLines={1}>
                    {s.type}
                    {s.where ? ` · ${s.where}` : ''}
                  </Text>
                  <Text style={styles.tcardP} numberOfLines={3}>
                    {cut(s.price, 60)}
                    {s.season ? ` · ${s.season}` : ''}
                  </Text>
                  {tel ? <Chip small tone="lime" label={tr('Связаться')} onPress={() => Linking.openURL(telHref(tel))} /> : url ? <Chip small label={tr('Подробнее')} onPress={() => Linking.openURL(url)} /> : null}
                </View>
              </View>
            );
          }}
        />
      )}
      {place.stay ? <ReadMore label={st.length ? tr('Все варианты ночлега') : tr('Подробнее')} onPress={onRead} /> : null}
    </View>
  );
}

export function FoodBlock({ place }: { place: Place }) {
  const F = place.p.food || [];
  if (!F.length && !place.food) return null;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Что попробовать')} />
      {place.food ? <RichText style={[styles.lead2, { textAlign: 'center' }]}>{lead(place.food, 1)}</RichText> : null}
      {F.length ? (
        <FlatList
          horizontal
          data={F}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.screenGutter, marginTop: 6 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screenGutter, gap: 10 }}
          renderItem={({ item: x }) => (
            <View style={styles.food}>
              <Text style={styles.foodB}>{x.name}</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 6 }}>
                <Icon name="pin" size={12} color={color.muted} />
                <Text style={styles.tcardS}>{x.where}</Text>
              </View>
              <RichText style={styles.foodP} numbers={false}>
                {cut(x.details, 160)}
              </RichText>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

export function HikesBlock({ place, onRead }: { place: Place; onRead: () => void }) {
  const H = place.p.onsite?.hikes || [];
  if (!H.length) return null;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Прогулки и тропы')} />
      {H.slice(0, 3).map((h, i) => (
        <View key={i} style={styles.hike}>
          <Text style={styles.hikeB}>{h.name}</Text>
          <Text style={styles.hikeR} numberOfLines={2}>
            {h.route}
          </Text>
          <View style={styles.chips}>
            {h.km ? <Chip small tone="lime" label={tr('{km} км', { km: h.km })} /> : null}
            {h.gain_m ? <Chip small label={tr('↑ {m} м', { m: cut(h.gain_m, 18) })} /> : null}
            {h.time ? <Chip small label={cut(h.time, 18)} /> : null}
            {h.difficulty ? <Chip small label={h.difficulty} /> : null}
          </View>
        </View>
      ))}
      {H.length > 3 ? <ReadMore label={tr('Все тропы ({n})', { n: H.length })} onPress={onRead} /> : null}
    </View>
  );
}

const USEFUL: ReaderKey[] = ['about', 'other', 'horses', 'rent', 'svc', 'budget', 'iti', 'access', 'reviews'];

/** «Полезное»: второстепенное в стиле inset grouped — иконка, заголовок, превью, шеврон; тап открывает ридер. */
export function UsefulBlock({ readers, onRead }: { readers: Partial<Record<ReaderKey, Reader>>; onRead: (k: ReaderKey) => void }) {
  const keys = USEFUL.filter((k) => readers[k]);
  if (!keys.length) return null;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Полезное')} />
      <View style={styles.glist}>
        {keys.map((k, i) => {
          const r = readers[k]!;
          return (
            <Pressable key={k} onPress={() => onRead(k)} style={({ pressed }) => [styles.grow, i > 0 && styles.kfLine, pressed && { backgroundColor: '#e8e8e3' }]} accessibilityRole="button">
              <View style={styles.gi}>
                <Icon name={r.icon} size={17} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.gt}>{r.title}</Text>
                {r.preview ? (
                  <Text style={styles.gp} numberOfLines={1}>
                    {cut(r.preview, 70)}
                  </Text>
                ) : null}
              </View>
              <View style={{ transform: [{ rotate: '-90deg' }] }}>
                <Icon name="chev" size={16} color={color.muted} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function NearbyBlock({ place, onMap }: { place: Place; onMap: () => void }) {
  const n = (place.nearby || []).filter((x) => getPlace(x.id)).slice(0, 4);
  if (!n.length) return null;
  return (
    <View style={[styles.sec, { gap: 10 }]}>
      <SectionHeader title={tr('Рядом')} more={tr('Показать на карте')} onMore={onMap} />
      {n.map((x) => {
        const q = getPlace(x.id)!;
        return <RowPlaceCard key={x.id} place={q} sub={tr('≈ {km} км по прямой · {cat}', { km: fmtKm(x.km), cat: catLabel(q.cat) })} />;
      })}
    </View>
  );
}

/** Проверка: кольцо индекса и полосы заполняются при появлении на экране. */
export function TrustBlock({ place, visible, onRead }: { place: Place; visible: boolean; onRead: () => void }) {
  const total = placesOf(place.c).length;
  return (
    <View style={styles.sec}>
      <SectionHeader title={tr('Проверка и источники')} />
      <View style={styles.trust}>
        {visible ? <IndexRing value={place.idx || 0} size={86} stroke={8} animate /> : <View style={{ width: 86, height: 86 }} />}
        <View style={{ flex: 1, gap: 6 }}>
          <Bar label={tr('Подтверждено полей')} v={place.conf || 0} max={34} go={visible} />
          <Bar label={tr('Насыщенность')} v={place.rich || 0} max={10} go={visible} />
          <Bar label={tr('Практика: дорога, ночлег')} v={place.prac || 0} max={10} go={visible} />
        </View>
      </View>
      <Text style={styles.small}>
        {tr('Индекс полноты 0–100.')}
        {place.rank ? tr(' №{rank} из {total} в разделе «{country}».', { rank: place.rank, total, country: place.c === 'kg' ? tr('Кыргызстан') : tr('Алтай') }) : ''}
      </Text>
      <ReadMore label={tr('Источники, спорные моменты, что не подтверждено')} onPress={onRead} />
    </View>
  );
}

function Bar({ label, v, max, go }: { label: string; v: number; max: number; go: boolean }) {
  const w = useSharedValue(0);
  if (go && w.get() === 0) w.set(withTiming(v / max, { duration: 1200, easing: motion.easeStandard }));
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }), [w]);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.barL}>{label}</Text>
        <Text style={styles.barV}>
          {v}/{max}
        </Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFg, st]} />
      </View>
    </View>
  );
}

const CHANGES = ['изменилась цена', 'дорога закрыта', 'предупреждение', 'другое'];

/** «Заметили изменения?»: отметка копится в офлайн-очереди (уйдёт в модерацию, когда появится бэкенд). */
export function ChangeReport({ place }: { place: Place }) {
  const [sel, setSel] = useState<string[]>([]);
  const add = useApp((s) => s.addReport);
  return (
    <View style={styles.change}>
      <Text style={styles.changeH}>{tr('Заметили изменения?')}</Text>
      <Text style={styles.changeP}>{tr('Помогите другим путешественникам — отметьте, что поменялось на месте')}</Text>
      <View style={[styles.chips, { justifyContent: 'center', marginBottom: 16 }]}>
        {CHANGES.map((t) => (
          <Chip key={t} tone="white" label={tr(t)} on={sel.includes(t)} onPress={() => setSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} />
        ))}
      </View>
      <Button
        label={tr('Отправить')}
        tone="black"
        onPress={() => {
          if (!sel.length) return toast(tr('Выберите, что изменилось'), 'info');
          add(place.id, sel);
          track('change_report', { place_id: place.id, tags: sel });
          flushReports();
          setSel([]);
          toast(tr('Спасибо! Отметка сохранена'), 'check');
        }}
      />
    </View>
  );
}

export function Footer() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 46, paddingBottom: 10, paddingHorizontal: 20 }}>
      <VoyzLogo width={280} fill="#151515" />
      <Text style={{ fontFamily: 'Mulish_400Regular', fontSize: 15, color: '#222', marginTop: 12 }}>{tr('Больше, чем просто поездки')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sec: { paddingHorizontal: spacing.screenGutter, paddingTop: spacing.sectionGap },
  lead2: { fontFamily: 'Mulish_400Regular', fontSize: 16, lineHeight: 24.8, color: '#262624', marginBottom: 6 },
  small: { ...type.caption, fontSize: 12.5, color: color.muted, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.chipGap },
  want: { marginHorizontal: spacing.screenGutter, marginTop: spacing.sectionGap, borderRadius: 28, paddingBottom: 16, backgroundColor: color.paper, borderWidth: 1.5, borderColor: color.limeLine, overflow: 'hidden' },
  wantHd: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  wantH: { fontFamily: 'Mulish_500Medium', fontSize: 22, textTransform: 'uppercase', color: color.black },
  wantP: { fontFamily: 'Mulish_400Regular', fontSize: 15, lineHeight: 21, textAlign: 'center', color: '#262624', paddingHorizontal: 20, paddingVertical: 14 },
  iti: { borderWidth: 1.5, borderColor: color.line, borderRadius: 18, padding: 14, marginBottom: 10 },
  itiB: { fontFamily: 'Mulish_700Bold', fontSize: 15.5, color: color.black },
  itiP: { fontFamily: 'Mulish_400Regular', fontSize: 14, lineHeight: 20, color: '#333', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyB: { fontFamily: 'Mulish_700Bold', fontSize: 16, color: color.black },
  months: { flexDirection: 'row', gap: 4, marginTop: 4, marginBottom: 12 },
  month: { flex: 1, height: 34, borderRadius: 9, backgroundColor: color.mist, alignItems: 'center', justifyContent: 'center' },
  monthNow: { borderWidth: 2, borderColor: color.black },
  monthT: { fontFamily: 'Mulish_700Bold', fontSize: 10.5, color: '#999' },
  important: { marginHorizontal: spacing.screenGutter, marginTop: spacing.sectionGap, borderRadius: 24, backgroundColor: color.olive, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  impH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 },
  impHT: { fontFamily: 'Mulish_500Medium', fontSize: 22, textTransform: 'uppercase', color: color.paper },
  impP: { fontFamily: 'Mulish_400Regular', fontSize: 14.5, lineHeight: 21.75, color: '#F1F3E6', textAlign: 'center', marginBottom: 8 },
  tcard: { width: 260, flexDirection: 'row', gap: 12, borderWidth: 1.5, borderColor: color.line, borderRadius: 22, padding: 12, backgroundColor: color.paper },
  tile: { width: 70, height: 96, borderRadius: 16, backgroundColor: '#0f1205', alignItems: 'center', justifyContent: 'center' },
  tcardB: { fontFamily: 'Mulish_700Bold', fontSize: 14.5, lineHeight: 18, color: color.black },
  tcardS: { fontFamily: 'Mulish_400Regular', fontSize: 12, color: color.muted, marginTop: 2 },
  tcardP: { fontFamily: 'Mulish_500Medium', fontSize: 12.5, lineHeight: 16, color: '#333', marginTop: 4, marginBottom: 6 },
  food: { width: 280, borderWidth: 1.5, borderColor: color.limeLine, borderRadius: 22, padding: 14, backgroundColor: color.paper },
  foodB: { fontFamily: 'Mulish_600SemiBold', fontSize: 15.5, color: color.black, marginBottom: 4 },
  foodP: { fontFamily: 'Mulish_400Regular', fontSize: 13.5, lineHeight: 19, color: '#262624' },
  hike: { borderWidth: 1.5, borderColor: color.black, borderRadius: 22, padding: 14, marginBottom: 10 },
  hikeB: { fontFamily: 'Mulish_700Bold', fontSize: 16, color: color.black },
  hikeR: { fontFamily: 'Mulish_400Regular', fontSize: 13.5, lineHeight: 19, color: '#333', marginTop: 4, marginBottom: 10 },
  glist: { borderRadius: 24, backgroundColor: color.mist, overflow: 'hidden' },
  grow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  kfLine: { borderTopWidth: 1, borderTopColor: '#e3e3de' },
  gi: { width: 32, height: 32, borderRadius: 10, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' },
  gt: { fontFamily: 'Mulish_700Bold', fontSize: 15, color: color.black },
  gp: { fontFamily: 'Mulish_400Regular', fontSize: 13, color: color.muted, marginTop: 1 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1.5, borderColor: color.black, borderRadius: 24, padding: 16 },
  barL: { fontFamily: 'Mulish_500Medium', fontSize: 12.5, color: '#333' },
  barV: { fontFamily: 'Mulish_800ExtraBold', fontSize: 12.5, color: color.black },
  barBg: { height: 6, borderRadius: 3, backgroundColor: '#ECECE6', overflow: 'hidden', marginTop: 4 },
  barFg: { height: 6, borderRadius: 3, backgroundColor: color.black },
  change: { marginHorizontal: spacing.screenGutter, marginTop: spacing.sectionGap, borderRadius: 28, backgroundColor: color.lime, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18 },
  changeH: { fontFamily: 'Mulish_500Medium', fontSize: 23, textTransform: 'uppercase', textAlign: 'center', color: color.black, marginBottom: 6 },
  changeP: { fontFamily: 'Mulish_400Regular', fontSize: 15, lineHeight: 21, textAlign: 'center', color: color.black, marginBottom: 16 },
});
