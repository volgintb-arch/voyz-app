import re,shutil
src='/home/claude/app/src/';out='/home/claude/app/dist/'
h=open(src+'index.html').read()
lf=open('/home/claude/app/lf.css').read()
lf=re.sub(r'url\([^)]*\)','none',lf)
h=h.replace('/*LEAFLET*/',lf).replace('/*STYLE*/',open(src+'style.css').read())
wm='<svg class="wm" viewBox="0 0 645 86"><path d="M3 4h46l40 50 40-50h47l-68 80H70z"/><path d="M206 2h78a40 40 0 010 80h-78a40 40 0 010-80zm6 27a8 8 0 000 16h66a8 8 0 000-16z"/><path d="M325 4h51l23 30 23-30h51l-56 50v30h-37V54z"/><path d="M490 4h150v26l-72 26h72v28H490V58l72-28h-72z"/></svg>'
h=h.replace('<!--WM-->',wm)
open(out+'index.html','w').write(h)
shutil.copy(src+'app.js',out+'app.js')
print('ok',len(h)//1024,'KB')
