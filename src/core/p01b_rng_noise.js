/* ------------------------------ RNG / noise ------------------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function h2(x,z,s){let h=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(s,962287633);h=Math.imul(h^h>>>13,1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function h3(x,y,z,s){let h=Math.imul(x,374761393)^Math.imul(y,2246822519)^Math.imul(z,668265263)^Math.imul(s,962287633);h=Math.imul(h^h>>>13,1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function smoothT(t){return t*t*(3-2*t);}
function vnoise2(x,z,s){
  const xi=Math.floor(x),zi=Math.floor(z),u=smoothT(x-xi),v=smoothT(z-zi);
  const a=h2(xi,zi,s),b=h2(xi+1,zi,s),c=h2(xi,zi+1,s),d=h2(xi+1,zi+1,s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function fbm2(x,z,s,oct){let a=0,amp=1,f=1,tot=0;for(let i=0;i<oct;i++){a+=vnoise2(x*f,z*f,s+i*1013)*amp;tot+=amp;amp*=0.5;f*=2;}return a/tot;}
function vnoise3(x,y,z,s){
  const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);
  const u=smoothT(x-xi),v=smoothT(y-yi),w=smoothT(z-zi);
  const c000=h3(xi,yi,zi,s),c100=h3(xi+1,yi,zi,s),c010=h3(xi,yi+1,zi,s),c110=h3(xi+1,yi+1,zi,s);
  const c001=h3(xi,yi,zi+1,s),c101=h3(xi+1,yi,zi+1,s),c011=h3(xi,yi+1,zi+1,s),c111=h3(xi+1,yi+1,zi+1,s);
  const x00=c000+(c100-c000)*u,x10=c010+(c110-c010)*u,x01=c001+(c101-c001)*u,x11=c011+(c111-c011)*u;
  const y0=x00+(x10-x00)*v,y1=x01+(x11-x01)*v;
  return y0+(y1-y0)*w;
}
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;

