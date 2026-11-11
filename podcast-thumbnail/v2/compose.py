import json, base64, random
random.seed(4)
W,H=1920,1080
M=json.load(open("faces/meta.json"))
NECKX={"G":110}  # neck x offset from head center (source px)
TEE={"A":"#141414","B":"#141414","C":"#4a5226","D":"#141414","E":"#141414","F":"#4a5226","G":"#141414","I":"#141414","J":"#141414"}
back=[("A",165,250),("B",490,235),("I",800,255),("J",1120,245),("C",1430,240),("D",1755,255)]
front=[("E",240,560),("F",640,575),("G",1280,570),("H",1690,565)]
def b64(k): return base64.b64encode(open(f"faces/{k}_cut.png","rb").read()).decode()
def mic(x,y,s,side):
    r=side*-12
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({r}) scale({s:.3f})" filter="url(#sh)">'
      f'<path d="M0,120 L{side*-40},260 L{side*-60},700" stroke="#0d0d0d" stroke-width="22" fill="none" stroke-linejoin="round"/>'
      f'<rect x="-46" y="-110" width="92" height="210" rx="46" fill="#1b1b1b"/>'
      f'<rect x="-46" y="-110" width="92" height="120" rx="46" fill="url(#grill)"/>'
      f'<rect x="-46" y="-110" width="92" height="120" rx="46" fill="url(#gloss)"/>'
      f'<rect x="-52" y="8" width="104" height="18" rx="6" fill="#333"/>'
      f'<rect x="-30" y="100" width="60" height="40" rx="8" fill="#111"/></g>')
def person(k,tx,ty,tw):
    m=M[k]; sc=tw/m["hw"]; x=tx-m["hx"]*sc; y=ty-m["hy"]*sc
    out=""
    if m["cut"]:
        nx=tx+NECKX.get(k,0)*sc; cy=y+m["cut"]*sc; top=cy-0.10*tw; c=TEE[k]
        out+=(f'<path d="M{nx-1.12*tw:.0f},{H+50} C{nx-1.08*tw:.0f},{top+0.35*tw:.0f} {nx-0.8*tw:.0f},{top+0.05*tw:.0f} {nx-0.35*tw:.0f},{top:.0f} '
              f'L{nx+0.35*tw:.0f},{top:.0f} C{nx+0.8*tw:.0f},{top+0.05*tw:.0f} {nx+1.08*tw:.0f},{top+0.35*tw:.0f} {nx+1.12*tw:.0f},{H+50} Z" fill="{c}" filter="url(#sh)"/>'
              f'<path d="M{nx-1.12*tw:.0f},{H+50} C{nx-1.08*tw:.0f},{top+0.35*tw:.0f} {nx-0.8*tw:.0f},{top+0.05*tw:.0f} {nx-0.35*tw:.0f},{top:.0f} L{nx+0.35*tw:.0f},{top:.0f} C{nx+0.8*tw:.0f},{top+0.05*tw:.0f} {nx+1.08*tw:.0f},{top+0.35*tw:.0f} {nx+1.12*tw:.0f},{H+50} Z" fill="url(#fab)"/>')
    out+=f'<image href="data:image/png;base64,{b64(k)}" x="{x:.1f}" y="{y:.1f}" width="{m["w"]*sc:.1f}" height="{m["h"]*sc:.1f}" filter="url(#grade)"/>'
    if m["cut"]:
        out+=f'<path d="M{nx-0.36*tw:.0f},{cy-0.02*tw:.0f} Q{nx:.0f},{cy+0.16*tw:.0f} {nx+0.36*tw:.0f},{cy-0.02*tw:.0f}" stroke="{TEE[k]}" stroke-width="{0.09*tw:.0f}" fill="none" stroke-linecap="round"/>'
    return out
def mics(row,tw):
    o=""
    for k,tx,ty in row:
        side=1 if tx<960 else -1
        o+=mic(tx+side*0.55*tw, ty+0.78*tw, tw/300*0.95, side)
    return o
strokes="".join(f'<path d="M{random.randint(-200,1900)},{random.randint(-50,900)} c{random.randint(150,400)},{random.randint(-120,120)} {random.randint(300,600)},{random.randint(-80,80)} {random.randint(500,900)},{random.randint(-150,150)}" stroke="{random.choice(["#6a2bd9","#7b2cbf","#ffb21f","#ff7a00","#9d4edd"])}" stroke-width="{random.randint(25,70)}" opacity="{random.uniform(.45,.85):.2f}" fill="none" stroke-linecap="round"/>' for _ in range(16))
FONT="'Liberation Sans','FreeSans',Arial,sans-serif"
title=f'''<g font-family="{FONT}" font-weight="700" text-anchor="middle">
<g transform="rotate(-2 960 900)" filter="url(#sh)">
 <rect x="735" y="742" width="450" height="128" fill="#0b0b0b"/>
 <text x="960" y="840" font-size="104" fill="#fff" stroke="#fff" stroke-width="5">בגג של</text>
 <rect x="610" y="862" width="700" height="190" fill="#0b0b0b"/>
 <text x="960" y="1010" font-size="168" fill="url(#org)" stroke="url(#org)" stroke-width="7" letter-spacing="-3">הב״הדים</text>
</g>
<g transform="rotate(-6 690 735)" filter="url(#sh)">
 <rect x="618" y="690" width="150" height="80" rx="14" fill="url(#org)" stroke="#000" stroke-width="5"/>
 <text x="693" y="752" font-size="64" fill="#000" stroke="#000" stroke-width="2" direction="ltr">#29</text>
</g></g>'''
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a00"/><stop offset=".55" stop-color="#ff4b1f"/><stop offset="1" stop-color="#d9142b"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".42" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<linearGradient id="org" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc35a"/><stop offset="1" stop-color="#ff7a00"/></linearGradient>
<linearGradient id="gloss" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<pattern id="grill" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#262626"/><circle cx="4.5" cy="4.5" r="2.2" fill="#4a4a4a"/></pattern>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".55"/></filter>
<filter id="grade" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="saturate" values="1.15"/><feComponentTransfer><feFuncR type="linear" slope="1.08" intercept="-0.03"/><feFuncG type="linear" slope="1.08" intercept="-0.03"/><feFuncB type="linear" slope="1.08" intercept="-0.03"/></feComponentTransfer><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".5"/></filter>
<linearGradient id="fab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient><filter id="rough"><feTurbulence baseFrequency=".03" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="40"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<g filter="url(#rough)">{strokes}</g>
{''.join(person(k,x,y,200) for k,x,y in back)}
{mics(back,200)}
{''.join(person(k,x,y,255) for k,x,y in front)}
{mics(front,255)}
<rect width="{W}" height="{H}" fill="url(#vig)"/>
{title}
</svg>'''
open("final.html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;background:#000}}</style></head><body>{svg}</body></html>')
