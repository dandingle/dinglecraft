/* helpers used by the hooked mob code */
function mobAnchor(){if(!AG_ACTIVE)return P;const L=[P];for(const a of AGENTS)if(a.e&&!a.dead&&a.online&&a.dim===DIM)L.push(a.e);return L.length===1?P:L[(Math.random()*L.length)|0];}
function mobFarFromAll(e){if(Math.hypot(e.x-P.x,e.z-P.z)<=64)return false;if(!AG_ACTIVE)return true;for(const a of AGENTS)if(a.e&&!a.dead&&Math.hypot(e.x-a.e.x,e.z-a.e.z)<=64)return false;return true;}
function mobClearOfPlayers(x,z){if(Math.hypot(x-P.x,z-P.z)<=12)return false;if(!AG_ACTIVE)return true;for(const a of AGENTS)if(a.e&&!a.dead&&Math.hypot(x-a.e.x,z-a.e.z)<=12)return false;return true;}

