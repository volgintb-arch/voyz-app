import json, math
from shapely.geometry import shape, box, mapping, LineString, MultiLineString
from shapely.ops import unary_union
G='/home/claude/app/geo/'
B=[box(68.5,38.8,81,44.0), box(81.0,49.0,90.5,55.5)]
def clip(g):
    out=[]
    for b in B:
        x=g.intersection(b)
        if not x.is_empty: out.append(x)
    return out
def lines(g):
    if g.geom_type=='LineString': return [g]
    if g.geom_type in('MultiLineString','GeometryCollection'): return [h for x in g.geoms for h in lines(x)]
    return []
R=lambda c:[round(c[0],4),round(c[1],4)]
roads=[];rlines=[]
for f in json.load(open(G+'ne_10m_roads.geojson'))['features']:
    g=shape(f['geometry'])
    for c in clip(g):
        for l in lines(c):
            l=l.simplify(0.004)
            major=f['properties']['type']=='Major Highway' or f['properties']['scalerank']<=4
            rlines.append((l,major))
rivers=[]
for f in json.load(open(G+'ne_10m_rivers_lake_centerlines.geojson'))['features']:
    for c in clip(shape(f['geometry'])):
        for l in lines(c):
            l=l.simplify(0.004)
            if l.length>0.05: rivers.append([R(p) for p in l.coords])
import re
h=open('/home/claude/out/Voyz_Kyrgyzstan_Altai_catalog_2026-10-14.html').read()
md=json.loads(re.search(r'<script[^>]*id="mapData"[^>]*>(.*?)</script>',h,re.S).group(1))
def polys(g):
    if g.geom_type=='Polygon': return [g]
    if g.geom_type in('MultiPolygon','GeometryCollection'): return [h for x in g.geoms for h in polys(x)]
    return []
BB=box(60,34,100,58)
countries=[]
for f in md['countries']['features']:
    g=shape(f['geometry']).intersection(BB)
    if g.is_empty: continue
    g=g.simplify(0.01)
    nm=f['properties'].get('NAME_RU') or f['properties'].get('NAME')
    for p in polys(g):
        countries.append({'n':nm,'r':[[R(c) for c in p.exterior.coords]]+[[R(c) for c in i.coords] for i in p.interiors]})
RU={'Russia':'Россия','Mongolia':'Монголия','Kazakhstan':'Казахстан','China':'Китайская Народная Республика'}
for f in json.load(open('/home/claude/catalog/altai_base.json'))['features']:
    nm=RU.get(f['properties'].get('ADMIN'),f['properties'].get('ADMIN'))
    if nm in ('Россия','Монголия'):
        for p in polys(shape(f['geometry']).simplify(0.01)):
            countries.append({'n':nm,'r':[[R(c) for c in p.exterior.coords]]+[[R(c) for c in i.coords] for i in p.interiors]})
lakes=[]
for f in md['lakes']['features']:
    g=shape(f['geometry']).intersection(BB)
    if g.is_empty: continue
    for p in polys(g.simplify(0.003)):
        lakes.append([[R(c) for c in p.exterior.coords]])
# graph
def hv(a,b):
    lo1,la1=a;lo2,la2=b
    p=math.pi/180
    x=math.sin((la2-la1)*p/2)**2+math.cos(la1*p)*math.cos(la2*p)*math.sin((lo2-lo1)*p/2)**2
    return 12742*math.asin(math.sqrt(x))
nodes={};NL=[];edges={}
def nid(c):
    k=(round(c[0],3),round(c[1],3))
    if k not in nodes: nodes[k]=len(NL);NL.append(k)
    return nodes[k]
for l,_ in rlines:
    cs=list(l.coords)
    for a,b in zip(cs,cs[1:]):
        i,j=nid(a),nid(b)
        if i!=j:
            w=hv(NL[i],NL[j]); edges[(min(i,j),max(i,j))]=w
# snap endpoints / near nodes within 2 km to connect fragments
import numpy as np
from scipy.spatial import cKDTree
deg=np.array(NL)
from collections import Counter
dgr=Counter()
for i,j in edges: dgr[i]+=1;dgr[j]+=1
tree=cKDTree(deg*[0.75,1])
added=0
for i,d in dgr.items():
    if d==1:
        for j in tree.query_ball_point(deg[i]*[0.75,1],0.03):
            if j!=i and (min(i,j),max(i,j)) not in edges:
                edges[(min(i,j),max(i,j))]=hv(NL[i],NL[j]);added+=1
print('nodes',len(NL),'edges',len(edges),'snapped',added)
import networkx as nx
Gx=nx.Graph()
for (i,j),w in edges.items(): Gx.add_edge(i,j,weight=w)
for _ in range(6):
    comps=sorted(nx.connected_components(Gx),key=len,reverse=True)
    lab={}
    for k,c in enumerate(comps):
        for n in c: lab[n]=k
    allidx=list(lab.keys()); T=cKDTree(deg[allidx]*[0.75,1])
    joined=0
    for k,c in enumerate(comps):
        best=None
        for n in c:
            for j in T.query_ball_point(deg[n]*[0.75,1],0.12):
                m=allidx[j]
                if lab[m]!=k:
                    d=hv(NL[n],NL[m])
                    if best is None or d<best[0]: best=(d,n,m)
        if best and best[0]<12:
            Gx.add_edge(best[1],best[2],weight=best[0]); edges[(min(best[1],best[2]),max(best[1],best[2]))]=best[0]; joined+=1
    if not joined: break
comps=sorted(nx.connected_components(Gx),key=len,reverse=True)
print('components',[len(c) for c in comps[:8]])
geo={'roads':[{'m':int(m),'c':[R(p) for p in l.coords]} for l,m in rlines],'rivers':rivers,'lakes':lakes,'countries':countries,
     'graph':{'n':[[round(a,3),round(b,3)] for a,b in NL],'e':[[i,j,round(w,2)] for (i,j),w in edges.items()]},
     'src':'Natural Earth 1:10m (public domain): roads, rivers, lakes, borders. Обзорная схема, не навигационная карта.'}
s=json.dumps(geo,ensure_ascii=False,separators=(',',':'))
open('/home/claude/app/dist/data/geo.js','w').write('window.VOYZ_GEO='+s+';')
json.dump(geo,open('/home/claude/app/geo/geo.json','w'),separators=(',',':'))
print('geo.js KB',len(s)//1024)
