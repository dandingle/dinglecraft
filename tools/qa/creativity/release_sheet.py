# release_sheet.py (release engineer, v6.2): 5x6 contact sheet of the first 30 numbered JPEGs from the given dirs.
#   python3 release_sheet.py <out.jpg> <dir> [<dir> ...]
import sys,glob
from PIL import Image,ImageDraw,ImageFont
out=sys.argv[1];files=[]
for d in sys.argv[2:]:files+=sorted(glob.glob(d+'/[0-9][0-9]_*.jpg'))
files=files[:30]
W,H,LB=384,216,18
S=Image.new('RGB',(5*W,6*(H+LB)),(24,24,24));dr=ImageDraw.Draw(S)
try:F=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',12)
except Exception:F=None
for i,f in enumerate(files):
  im=Image.open(f).convert('RGB');im.thumbnail((W,H));x=(i%5)*W;y=(i//5)*(H+LB);S.paste(im,(x,y+LB));dr.text((x+4,y+3),f.split('/')[-1][:-4],fill=(255,230,150),font=F)
S.save(out,quality=88);print(out,len(files),'frames',S.size)
