# Generates the 1920x1080 thumbnail layout template (placeholders, no faces).
import random
random.seed(7)
W,H=1920,1080
back=[("A",380,"משקפיים · צוחק"),("B",780,"מבט חודר · חיוך קטן"),("C",1150,"פה פתוח · צוחק"),("D",1540,"גבה מורמת · חיוך")]
front=[("E",210,"צוחקת · ראש לאחור"),("F",650,"חיוך גדול למצלמה"),("G",1270,"צוחק חזק · עיניים מכווצות"),("H",1710,"צועקת · יד מורמת")]
def person(id,x,cy,s,label,col):
    rx,ry=85*s,105*s
    sh=f'<path d="M{x-205*s},{H+40} C{x-200*s},{cy+ry+60*s} {x-140*s},{cy+ry+10*s} {x-55*s},{cy+ry-5*s} L{x+55*s},{cy+ry-5*s} C{x+140*s},{cy+ry+10*s} {x+200*s},{cy+ry+60*s} {x+205*s},{H+40} Z" fill="{col}" stroke="#ff7a3d" stroke-opacity=".35" stroke-width="3"/>'
    head=f'<ellipse cx="{x}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{col}"/>'
    rim=f'<ellipse cx="{x}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="url(#rim)" stroke-width="{5*s}"/>'
    hp=(f'<path d="M{x-rx-6*s},{cy+5*s} C{x-rx-10*s},{cy-ry-40*s} {x+rx+10*s},{cy-ry-40*s} {x+rx+6*s},{cy+5*s}" fill="none" stroke="#111" stroke-width="{16*s}" stroke-linecap="round"/>'
        f'<rect x="{x-rx-26*s}" y="{cy-25*s}" width="{38*s}" height="{70*s}" rx="{14*s}" fill="#111"/>'
        f'<rect x="{x+rx-12*s}" y="{cy-25*s}" width="{38*s}" height="{70*s}" rx="{14*s}" fill="#111"/>')
    tag=(f'<circle cx="{x}" cy="{cy-10*s}" r="{34*s}" fill="#fff" fill-opacity=".92"/>'
         f'<text x="{x}" y="{cy+4*s}" font-size="{42*s}" font-weight="800" text-anchor="middle" fill="#c2261b">{id}</text>'
         f'<text x="{x}" y="{cy+60*s}" font-size="{20*s}" text-anchor="middle" fill="#fff" fill-opacity=".9">{label}</text>')
    return sh+head+rim+hp+tag
def mic(x,y,lean):
    bx=x+lean*170
    return (f'<path d="M{bx},{H+20} L{bx-lean*40},{y+190} L{x},{y+70}" fill="none" stroke="#151515" stroke-width="12" stroke-linejoin="round"/>'
            f'<rect x="{x-32}" y="{y-70}" width="64" height="150" rx="30" fill="#1a1a1a"/>'
            f'<rect x="{x-32}" y="{y-70}" width="64" height="80" rx="30" fill="url(#grill)"/>'
            f'<rect x="{x-38}" y="{y+40}" width="76" height="14" rx="5" fill="#2b2b2b"/>')
bokeh=''.join(f'<circle cx="{random.randint(0,W)}" cy="{random.randint(0,650)}" r="{random.randint(25,90)}" fill="#ffe2b0" fill-opacity="{random.uniform(.08,.25):.2f}" filter="url(#blur)"/>' for _ in range(22))
strokes=('<g filter="url(#rough)" fill="none" stroke-linecap="round">'
 '<path d="M-40,180 C300,90 520,240 860,120" stroke="#7b2cbf" stroke-width="70" opacity=".75"/>'
 '<path d="M1180,90 C1450,30 1650,190 1980,110" stroke="#9d4edd" stroke-width="55" opacity=".7"/>'
 '<path d="M1500,760 C1700,700 1850,820 1990,760" stroke="#7b2cbf" stroke-width="60" opacity=".55"/>'
 '<path d="M-30,820 C120,760 260,860 420,800" stroke="#9d4edd" stroke-width="50" opacity=".5"/></g>')
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="Heebo, Arial, sans-serif">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a1f"/><stop offset=".5" stop-color="#ff5a1f"/><stop offset="1" stop-color="#d1121f"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<linearGradient id="rim" x1="0" x2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff3fa4"/></linearGradient>
<pattern id="grill" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2a2a2a"/><circle cx="4" cy="4" r="2" fill="#444"/></pattern>
<filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="rough"><feTurbulence baseFrequency=".035" numOctaves="3" seed="3"/><feDisplacementMap in="SourceGraphic" scale="28"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>{bokeh}{strokes}
{''.join(person(i,x,300,0.95,l,"#4a1a12") for i,x,l in back)}
{''.join(person(i,x,560,1.45,l,"#2e130e") for i,x,l in front)}
{mic(380,880,1)}{mic(800,890,1)}{mic(1120,890,-1)}{mic(1540,880,-1)}
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<g transform="rotate(-3 960 975)">
<path d="M430,902 L1460,888 L1445,1062 L415,1072 Z" fill="#111" fill-opacity=".88"/>
<path d="M430,902 L1460,888" stroke="#ffd60a" stroke-width="8"/>
<text x="1010" y="1010" font-size="88" font-weight="900" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke" letter-spacing="-1">בגג של הב״הדים</text>
<rect x="455" y="925" width="150" height="110" rx="18" fill="#ffd60a" transform="rotate(4 530 980)"/>
<text x="530" y="1012" font-size="80" font-weight="900" text-anchor="middle" fill="#111" transform="rotate(4 530 980)" direction="ltr">#29</text>
</g>
</svg>'''
open("thumbnail.svg","w").write(svg)
open("thumbnail.html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;800;900&display=swap" rel="stylesheet"><style>html,body{{margin:0;background:#000}}</style></head><body>{svg}</body></html>')
