# ui_sheet.py: 5x6 contact sheets for tools/qa/ui/ui_qa.mjs. python3 tools/qa/ui/ui_sheet.py <ui_qa out dir>
#   One sheet per window size x UI scale folder (<W>x<H>_<scale>/NN_view.jpg -> sheet_<W>x<H>_<scale>.jpg), at most 30 frames each,
#   every tile labelled with the folder and the view. Needs Pillow (tools/requirements.txt).
import sys,glob,os
from PIL import Image,ImageDraw,ImageFont
root=sys.argv[1]
try:F=ImageFont.truetype('DejaVuSansMono.ttf',14)
except Exception:
  try:F=ImageFont.truetype('Menlo.ttc',14)
  except Exception:F=ImageFont.load_default()
n=0
for d in sorted(glob.glob(os.path.join(root,'*x*_*'))):
  if not os.path.isdir(d):continue
  files=sorted(glob.glob(os.path.join(d,'[0-9][0-9]_*.jpg')))[:30]
  if not files:continue
  im0=Image.open(files[0]);ar=im0.size[1]/im0.size[0]
  W=400;H=int(W*ar);LB=20;cols=5;rows=(len(files)+cols-1)//cols
  S=Image.new('RGB',(cols*W,rows*(H+LB)),(24,24,24));dr=ImageDraw.Draw(S)
  tag=os.path.basename(d)
  for i,f in enumerate(files):
    im=Image.open(f).convert('RGB');im.thumbnail((W,H),Image.LANCZOS)
    x=(i%cols)*W;y=(i//cols)*(H+LB);S.paste(im,(x,y+LB))
    dr.text((x+4,y+2),tag+'  '+os.path.basename(f)[:-4],fill=(255,230,150),font=F)
  out=os.path.join(root,'sheet_'+tag+'.jpg');S.save(out,quality=88);n+=1
print('ui_sheet: %d contact sheets in %s'%(n,root))
