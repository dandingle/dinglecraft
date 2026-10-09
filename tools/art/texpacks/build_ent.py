#!/usr/bin/env python3
import sys,os,json,glob,numpy as np
# Entity textures from the cast hero shots: <DC_ART_SRC>/raw/ent -> <DC_ART_SRC>/final_ent (needs $DC_ART_SRC).
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import tex
import dcpaths
from PIL import Image
_S=dcpaths.hr_src()
R=_S+'raw/ent';F=_S+'final_ent';os.makedirs(F,exist_ok=True)
# Release 1.0 retired H10 and H20 (their ids were removed from the game) and renamed H11's id to boomer_core: the raw
# outputs keep their v6.0 file names, so each is found by its H-number prefix (raw/ent/<Hnn>_*_images_0.png).
HERO={'H01':'face_dan','H02':'hair_shared','H03':'fist_dan','H04':'face_brad','H05':'face_creepah','H06':'face_bee','H07':'honeycomb','H08':'face_zombie',
 'H09':'stump_section','H11':'boomer_core','H12':'foot_top','H13':'eye_human','H14':'skull_front','H15':'cocoon','H16':'face_pig',
 'H17':'face_cow','H18':'cowhide','H19':'face_sheep'}
CROP_AUTO={'H01','H03','H04','H05','H08','H12'}
CROP_FIX={'H09':(0.17,0.17,0.83,0.83)}
log={}
def save(id_,base,normal=None,rough=None):
    Image.fromarray(np.clip(base,0,255).astype(np.uint8)).save(f'{F}/{id_}_basecolor.png')
    if normal is not None:Image.fromarray(np.clip(normal,0,255).astype(np.uint8)).save(f'{F}/{id_}_normal.png')
    if rough is not None:Image.fromarray(np.clip(rough,0,255).astype(np.uint8)).save(f'{F}/{id_}_roughness.png')
for n,id_ in HERO.items():
    raw=sorted(glob.glob(f'{R}/{n}_*_images_0.png'))
    if len(raw)!=1:raise SystemExit(f'{n}: expected one raw output, found {len(raw)}')
    im=Image.open(raw[0]).convert('RGB').resize((1024,1024),Image.LANCZOS)
    if n in CROP_AUTO: im,box=tex.autocrop(im);log[id_]=box
    if n in CROP_FIX:
        a,b,c,d=CROP_FIX[n];im=im.crop((int(a*1024),int(b*1024),int(c*1024),int(d*1024))).resize((1024,1024),Image.LANCZOS);log[id_]='fixed'
    a=np.asarray(im).astype(np.float32)
    save(id_,a,tex.normal_from(a,2.0))
def fixnormal(path):
    n=np.asarray(Image.open(path).convert('RGB')).astype(np.float32)/255*2-1
    lf=tex.equalize_arr(n[...,:2].copy()*0+n[...,:2],60,1.0) if False else None
    h,w=n.shape[:2];fy=np.fft.fftfreq(h)[:,None];fx=np.fft.fftfreq(w)[None,:];g=np.exp(-2*(np.pi**2)*(60**2)*(fx**2+fy**2))
    for c in (0,1):n[...,c]-=np.real(np.fft.ifft2(np.fft.fft2(n[...,c])*g))
    n[...,2]=np.sqrt(np.clip(1-n[...,0]**2-n[...,1]**2,0.05,1))
    return (n*0.5+0.5)*255
EXT={'mat_jersey':'M2_mat_jersey_x','mat_burlap':'M3_mat_burlap_x','mat_rotflesh':'M4_mat_rotflesh_x','mat_bone':'M5_mat_bone_x','mat_mossflesh':'M6_mat_mossflesh_x','mat_skin':'M1_skin_fix'}
for id_,src in EXT.items():
    b=np.asarray(Image.open(f'{R}/{src}_images_1.png').convert('RGB')).astype(np.float32)
    r=np.asarray(Image.open(f'{R}/{src}_images_3.png').convert('RGB')).astype(np.float32)
    save(id_,tex.equalize_arr(b,60,0.85),fixnormal(f'{R}/{src}_images_2.png'),tex.equalize_arr(r,60,0.85)[...,0])
for id_,src,band in [('mat_wool',f'{R}/M8_wool_fix_images_1.png',0.4),('mat_chitin',f'{R}/M7_chitin_b_images_0.png',0.4)]:
    b=np.asarray(Image.open(src).convert('RGB').resize((1024,1024),Image.LANCZOS)).astype(np.float32)
    b=tex.equalize_arr(tex.seamless_arr(b,band),60,0.85)
    save(id_,b,tex.normal_from(b,2.2))
json.dump(log,open(f'{F}/_crops.json','w'),indent=1)
print('built',len(os.listdir(F)),'files; crops',log)
