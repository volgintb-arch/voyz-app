import json, re, math, base64, io, os
from PIL import Image
import networkx as nx, numpy as np
from scipy.spatial import cKDTree
D=json.load(open('/tmp/claude-0/-home-claude/cecf6cff-0236-53cb-9f8e-8ca3e4d33862/scratchpad/cat.json'))
geo=json.load(open('/home/claude/app/geo/geo.json'))
OUT='/home/claude/app/dist/'
NL=geo['graph']['n'];Gx=nx.Graph()
for i,j,w in geo['graph']['e']: Gx.add_edge(i,j,weight=w)
comp_of={}
for k,c in enumerate(sorted(nx.connected_components(Gx),key=len,reverse=True)):
    for n in c: comp_of[n]=k
big=[n for n in range(len(NL)) if n in comp_of and len([1 for _ in [0]])]
CS={}
for n,k in comp_of.items(): CS[k]=CS.get(k,0)+1
big=[n for n in range(len(NL)) if n in comp_of and CS[comp_of[n]]>=40]
bigarr=np.array([NL[n] for n in big]); tree=cKDTree(bigarr*[0.72,1])
def hv(a,b):  # a,b = (lat,lon)
    p=math.pi/180
    x=math.sin((b[0]-a[0])*p/2)**2+math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 12742*math.asin(math.sqrt(x))
def near(lat,lon):
    d,i=tree.query([lon*0.72,lat]); n=big[i]; return n, hv((lat,lon),(NL[n][1],NL[n][0]))
def road(a,b):
    na,da=near(*a); nb,db=near(*b)
    if da>30 or db>30 or comp_of[na]!=comp_of[nb]: return None
    try: path=nx.shortest_path(Gx,na,nb,weight='weight')
    except nx.NetworkXNoPath: return None
    km=nx.path_weight(Gx,path,weight='weight')
    return {'c':[[NL[n][1],NL[n][0]] for n in path],'km':round(km),'snap':[round(da,1),round(db,1)]}
HUBS={'Бишкек':(42.8746,74.5698),'Каракол':(42.4907,78.3936),'Нарын':(41.4287,75.9911),'Ош':(40.5283,72.7985),'Кочкор':(42.2150,75.7550),
'Талас':(42.5228,72.2428),'Балыкчи':(42.4600,76.1870),'Балыкчы':(42.4600,76.1870),'Чолпон-Ата':(42.6490,77.0820),'Боконбаево':(42.1180,76.9900),
'Джалал-Абад':(40.9333,73.0000),'Токтогул':(41.8750,72.9410),'Сары-Могол':(39.6800,72.8900),'Барскоон':(42.1560,77.6050),'Кызыл-Суу':(42.3420,78.0040),
'Казарман':(41.4040,74.0370),'Тамчы':(42.5570,76.6600),'Каджи-Сай':(42.1400,77.1800),'Тосор':(42.1679,77.4418),'Баткен':(40.0620,70.8190),
'Арсланбоб':(41.3360,72.9380),'Сары-Таш':(39.7290,73.2500),'Алматы':(43.2380,76.9450),'Ташкент':(41.3110,69.2790),'Кочкорка':(42.2150,75.7550),
'Горно-Алтайск':(51.9580,85.9600),'Бийск':(52.5390,85.2130),'Барнаул':(53.3480,83.7790),'Новосибирск':(55.0300,82.9200),'Акташ':(50.3170,87.6070),
'Кош-Агач':(49.9920,88.6720),'Онгудай':(50.7490,86.1360),'Чемал':(51.4110,86.0040),'Артыбаш':(51.7900,87.2700),'Усть-Кокса':(50.2700,85.6150),
'Тюнгур':(50.1620,86.3000),'Улаган':(50.6300,87.9630),'Манжерок':(51.8290,85.8100),'Элекмонар':(51.4600,85.9900),'Турочак':(52.2570,87.1240),'Иогач':(51.7800,87.2600)}
for l in D['locations']:
    s=l.get('geo_settlement')
    if isinstance(s,dict) and s.get('coords'): HUBS.setdefault(s['name'],tuple(s['coords']))
HUBKEYS=sorted(HUBS,key=len,reverse=True)
def find_hub(t):
    best=None
    for k in HUBKEYS:
        m=re.search(r'(?<![А-Яа-яЁё-])'+re.escape(k),t or '')
        if m and (best is None or m.start()<best[1]): best=(k,m.start())
    return best[0] if best else None
def coords(t):
    m=re.search(r'(-?\d{2}\.\d{2,})\s*[,;]?\s*°?\s*[NС]?\s*,?\s*(-?\d{2,3}\.\d{2,})',str(t or ''))
    if m:
        a,b=float(m.group(1)),float(m.group(2))
        if 35<a<57 and 60<b<95: return [a,b]
    return None
def first(t,n=34):
    t=str(t or '').strip()
    t=re.split(r'[:.;(]|\s[—–-]\s',t)[0].strip()
    return t if len(t)<=n else t[:n].rsplit(' ',1)[0]+'…'
def access(p):
    t=' '.join(str((a.get('vehicle') or ''))+' '+str(a.get('route') or '') for a in p) .lower()
    v=' '.join(str(a.get('vehicle') or '') for a in p).lower()
    if re.search(r'катер|лодк|теплох',t) and not re.search(r'седан|4|внедор',v): return 'По воде'
    if re.search(r'седан|легков|любая',v): return 'На любой машине'
    if re.search(r'4\s*[x×х]\s*4|внедор|уаз|полный',v): return 'Нужен 4×4'
    if re.search(r'пеш|трек',v): return 'Только пешком'
    if re.search(r'кон',v): return 'Верхом'
    return first(v,22) if v else '—'
# images
IMG={}
os.makedirs(OUT+'img',exist_ok=True)
def save_img(mid):
    if mid in IMG: return IMG[mid]
    uri=D['images'].get(mid)
    if not uri or not uri.startswith('data:'): return None
    im=Image.open(io.BytesIO(base64.b64decode(uri.split(',',1)[1]))).convert('RGB')
    w,h=im.size
    if w>960: im=im.resize((960,round(h*960/w)))
    im.save(OUT+f'img/{mid}.jpg',quality=74,optimize=True,progressive=True)
    t=im.copy(); t.thumbnail((420,420)); t.save(OUT+f'img/t_{mid}.jpg',quality=70,optimize=True)
    IMG[mid]={'f':f'img/{mid}.jpg','t':f'img/t_{mid}.jpg','w':im.size[0],'h':im.size[1]}
    return IMG[mid]
MON=['янв','фев','мар','апр','ма[йя]','июн','июл','авг','сен','окт','ноя','дек']
MN=['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
def months(t):
    t=str(t or '').lower()[:260]
    if re.search(r'кругл\w* год|весь год|в любое время',t[:120]): return list(range(1,13))
    toks=[(m.start(),i+1) for i,pat in enumerate(MON) for m in re.finditer(pat,t)]
    toks.sort(); S=set()
    for k,(pos,mo) in enumerate(toks):
        S.add(mo)
        if k+1<len(toks):
            gap=t[pos:toks[k+1][0]]
            if re.search(r'^[а-я]*\.?\s*(–|—|-|по|до)\s*$',gap):
                a,b=mo,toks[k+1][1]; x=a
                while x!=b: S.add(x); x=x%12+1
    return sorted(S)
def mlabel(ms):
    if not ms: return ''
    if len(ms)==12: return 'Круглый год'
    # find contiguous run (wrap)
    s=set(ms)
    start=[m for m in ms if (m-2)%12+1 not in s]
    runs=[]
    for a in start:
        b=a
        while b%12+1 in s: b=b%12+1
        runs.append((a,b))
    a,b=max(runs,key=lambda r:(r[1]-r[0])%12)
    return MN[a-1] if a==b else f'{MN[a-1]} – {MN[b-1].lower()}'
def diffn(t):
    t=str(t or '').lower()
    m=re.search(r'(очень л[её]гк|л[её]гк|легк|средн|сложн|высок|трудн|тяж[её]л)\w*(\s*[–—-]\s*(средн|сложн|высок)\w*)?',t)
    if not m: return 'См. описание'
    base={'очень':'Очень лёгкая','л':'Лёгкая','с':'Средняя','в':'Высокая','т':'Сложная'}
    w=m.group(1)
    lab='Очень лёгкая' if w.startswith('очень') else 'Лёгкая' if w.startswith(('лёгк','легк','лег')) else 'Средняя' if w.startswith('средн') else 'Сложная' if w.startswith(('сложн','трудн','тяж')) else 'Высокая'
    if m.group(3): lab+='–'+('средняя' if m.group(3).startswith('средн') else 'сложная' if m.group(3).startswith('сложн') else 'высокая')
    return lab
def accn(a):
    if a.startswith('любой') or a=='—': return 'На любой машине'
    if a=='кроссовер': return 'Кроссовер'
    return a
places=[]; stats={'routes':0,'road':0}
for l in D['locations']:
    F=l['fields'];P=l.get('practical') or {};R=l.get('research') or {}
    c=coords(F.get('Координаты'))
    pid=l['id']
    rating=None
    m=re.search(r'Google[^:]{0,20}:\s*(\d[,.]\d)\s*(?:/5)?,?\s*([\d\s ]+)\s*(оцен|отзыв)',str(F.get('Отзывы','')))
    if m: rating={'v':m.group(1).replace(',','.'),'n':re.sub(r'\D','',m.group(2)),'src':'Google'}
    else:
        m=re.search(r'(Яндекс|2ГИС|2GIS|TripAdvisor)[^:]{0,20}:\s*(\d[,.]\d)',str(F.get('Отзывы','')))
        if m: rating={'v':m.group(2).replace(',','.'),'n':'','src':m.group(1)}
    tv=re.search(r'Осмотр[^:]*:\s*([^.;]+)',str(F.get('Время в пути','')))
    hikes=(P.get('on_site') or {}).get('hikes') or []
    onsite=tv.group(1).strip() if tv else (hikes[0].get('time') if hikes else '')
    photos=[]
    for g in l.get('gallery') or []:
        im=save_img(g.get('media_id'))
        if im: photos.append({**im,'cap':g.get('caption') or g.get('description') or '','by':g.get('artist') or '','lic':g.get('license') or '','page':g.get('file_page') or ''})
    links=[{'cap':g.get('caption') or g.get('title') or 'Фото','url':g.get('file_page') or g.get('original_url') or g.get('page_url') or '','by':g.get('artist') or ''} for g in (l.get('gallery_links') or [])]
    vids=[{'t':v.get('title') or 'Видео','u':v.get('url'),'ch':v.get('channel') or '','y':v.get('year') or ''} for v in (R.get('videos') or []) if v.get('url')]
    apps=[]
    for a in (P.get('approaches') or []):
        if not isinstance(a,dict): continue
        hub=find_hub(a.get('from','')) or find_hub(a.get('route',''))
        pk=a.get('parking') if isinstance(a.get('parking'),dict) else {}
        th=a.get('trailhead') if isinstance(a.get('trailhead'),dict) else {}
        pc=coords(pk.get('coords'));tc=coords(th.get('coords'))
        end=pc or tc or c
        rt=None
        if hub and end:
            hc=HUBS[hub]; stats['routes']+=1
            r=road(hc,end)
            if r and hv(hc,end)>3: stats['road']+=1
            rt={'hub':hub,'hc':list(hc),'road':r['c'] if r else None,'rkm':r['km'] if r else None,'pc':pc,'tc':tc}
        apps.append({'title':a.get('title',''),'from':a.get('from',''),'route':a.get('route',''),'km':a.get('distance_km',''),'time':a.get('time',''),
            'surface':a.get('road',''),'vehicle':a.get('vehicle',''),'season':a.get('season',''),'last':a.get('last_services',''),
            'parking':{'d':pk.get('desc',''),'price':pk.get('price','')},'trail':{'d':th.get('desc','')},'haz':a.get('hazards',''),
            'rec':bool(a.get('recommended')),'src':a.get('src',''),'rt':rt})
    apps.sort(key=lambda a:not a['rec'])
    alerts=[]
    if l.get('meta',{}).get('alert'): alerts.append(l['meta']['alert'])
    places.append({'id':pid,'c':l['country'],'name':l['name'],'full':F.get('Локация',''),'cat':F.get('Категория',''),'reg':F.get('Регион / область',''),
      'dist':first(F.get('Район',''),60),'near':F.get('Ближайший населённый пункт',''),'ll':c,'elev':F.get('Высота',''),
      'short':F.get('Короткое описание',''),'desc':F.get('Полное описание',''),'guide':F.get('Voyz гид',''),'see':F.get('Что посмотреть',''),
      'skip':F.get('Можно пропустить, если',''),'diff':F.get('Сложность',''),'when':F.get('Когда лучше ехать',''),'hours':F.get('Режим работы',''),
      'daytime':F.get('Лучшее время суток',''),'how':F.get('Как добраться',''),'needcar':F.get('Нужен ли транспорт',''),'self':F.get('Можно самостоятельно',''),
      'roadtype':F.get('Тип дороги',''),'traveltime':F.get('Время в пути',''),'stay':F.get('Проживание',''),'net':F.get('Связь/Интернет',''),
      'entry':F.get('Стоимость входа',''),'transfer':F.get('Стоимость трансфера',''),'bring':F.get('Что взять',''),'warn':F.get('Важное предупреждение',''),
      'food':F.get('Что попробовать (кухня)',''),'reviews':F.get('Отзывы',''),
      'm':months(F.get('Когда лучше ехать','')) or months(P.get('season','')),'s':{'diff':diffn(F.get('Сложность','')),'when':mlabel(months(F.get('Когда лучше ехать','')) or months(P.get('season',''))) or first(F.get('Когда лучше ехать',''),24),'acc':accn(access(P.get('approaches') or [])),'onsite':first(onsite,18) if onsite else '',
           'entry':first(F.get('Стоимость входа',''),22),'net':first(F.get('Связь/Интернет',''),22)},
      'rating':rating,'idx':R.get('index'),'rich':R.get('richness'),'conf':R.get('confirmed'),'prac':R.get('practical'),'rank':R.get('rank'),'top':R.get('top'),
      'note':R.get('richness_note',''),'flags':R.get('red_flags') or [],'fixes':[{'f':x.get('field'),'n':x.get('new'),'u':x.get('url')} for x in (R.get('corrections') or [])][:12],
      'checked':(l.get('meta') or {}).get('note',''),'status':(l.get('meta') or {}).get('status',''),
      'photos':photos,'plinks':links[:6],'videos':vids[:6],'nearby':l.get('geo_nearby') or [],
      'p':{'sum':P.get('summary',''),'apps':apps,'transport':P.get('transport') or [],'onsite':P.get('on_site') or {},'stays':P.get('stays') or [],
           'food':P.get('food') or [],'rent':P.get('rentals') or [],'svc':P.get('services') or {},'iti':P.get('itineraries') or [],'season':P.get('season',''),
           'budget':P.get('budget') or {},'permits':P.get('permits',''),'access':P.get('accessibility',''),'gaps':P.get('gaps') or [],'src':P.get('sources') or []},
      'src':R.get('sources') or []})
print(stats, len(places), 'imgs',len(IMG))
meta={'countries':D['countries'],'built':'2026-10-14','count':len(places)}
s=json.dumps({'meta':meta,'places':places},ensure_ascii=False,separators=(',',':'))
open(OUT+'data/places.js','w').write('window.VOYZ_DATA='+s+';')
print('places.js MB',round(len(s.encode())/1e6,2))
# sanity: show route summary for some
for p in places[:6]:
    for a in p['p']['apps'][:2]:
        rt=a['rt'];print(p['name'],'|',rt and rt['hub'],rt and rt['rkm'],'pc' if rt and rt['pc'] else '', '|',a['km'][:40])
print('no coords:',[p['name'] for p in places if not p['ll']])
print('no hub:',sum(1 for p in places for a in p['p']['apps'] if not a['rt']))
