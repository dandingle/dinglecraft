#!/usr/bin/env python3
"""Run shot-list jobs through fal in parallel (PAID). usage: python3 tools/art/texpacks/wave.py <ids comma> [maxpar]
Reads <DC_ART_SRC>/raw/ent/shotlist.json; every call goes through tools/art/fal.mjs (its budget guard refuses without a budget)."""
import json,subprocess,sys,os,time
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dcpaths
H=dcpaths.hr_src().rstrip('/');OUT=f'{H}/raw/ent'
jobs={j['n']:j for j in json.load(open(f'{OUT}/shotlist.json'))}
GUIDE={'H10':'boomer','H14':'skel','H16':'pig','H17':'cow'}
EDITOF={'H04':'H01','H08':'H01','H20':'H01','H11':'H10','H18':'H17'}
def first_img(n):
    j=jobs[n];p=f"{OUT}/{n}_{j['id']}_images_0.png"
    return p if os.path.exists(p) else None
ids=sys.argv[1].split(',');maxpar=int(sys.argv[2]) if len(sys.argv)>2 else 8
procs=[]
for n in ids:
    j=jobs[n];lab=f"{n}_{j['id']}"
    if n in GUIDE: ep='fal-ai/nano-banana-pro/edit';inp={'image_urls':[f'{OUT}/guides/{GUIDE[n]}.png'],'prompt':j['prompt'],'aspect_ratio':'1:1','resolution':'1K'}
    elif n in EDITOF:
        src=first_img(EDITOF[n]);assert src,f'{n} needs {EDITOF[n]} first'
        ep='fal-ai/nano-banana-pro/edit';inp={'image_urls':[src],'prompt':j['prompt'],'aspect_ratio':'1:1','resolution':'1K'}
    else: ep='fal-ai/nano-banana-pro';inp={'prompt':j['prompt'],'aspect_ratio':'1:1','resolution':'1K'}
    f=f'{OUT}/{lab}.in.json';open(f,'w').write(json.dumps(inp))
    while len([p for p in procs if p.poll() is None])>=maxpar:time.sleep(1)
    procs.append(subprocess.Popen(['node',dcpaths.FAL,ep,f,OUT,lab,'0.15'],stdout=open(f'{OUT}/{lab}.log','w'),stderr=subprocess.STDOUT))
for p in procs:p.wait()
for n in ids:
    j=jobs[n];lab=f"{n}_{j['id']}";t=open(f'{OUT}/{lab}.log').read().strip()[-160:]
    print(lab,'OK' if '"ok":true' in t else 'FAIL '+t)
