# Generates the 1920x1080 thumbnail layout template (placeholders, no faces).
import random, os, base64
FACES=os.environ.get('FACES_DIR')
OUT=os.environ.get('OUT','thumbnail')
random.seed(7)
W,H=1920,1080
back=[("A",380,"משקפיים · צוחק"),("B",780,"מבט חודר · חיוך קטן"),("C",1150,"פה פתוח · צוחק"),("D",1540,"גבה מורמת · חיוך")]
front=[("E",210,"צוחקת · ראש לאחור"),("F",690,"חיוך גדול למצלמה"),("G",1230,"צוחק חזק · עיניים מכווצות"),("H",1710,"צועקת · יד מורמת")]
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

def photo(id,x,cy,r):
    d=base64.b64encode(open(f"{FACES}/{id}_sq.jpg","rb").read()).decode()
    return (f'<clipPath id="c{id}"><circle cx="{x}" cy="{cy}" r="{r}"/></clipPath>'
     f'<circle cx="{x}" cy="{cy}" r="{r+14}" fill="#000" filter="url(#pdrop)"/>'
     f'<image href="data:image/jpeg;base64,{d}" x="{x-r}" y="{cy-r}" width="{2*r}" height="{2*r}" clip-path="url(#c{id})" preserveAspectRatio="xMidYMid slice"/>'
     f'<circle cx="{x}" cy="{cy}" r="{r+5}" fill="none" stroke="url(#ring)" stroke-width="10"/>')
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
PEOPLE=(''.join(photo(i,x,270,165) for i,x,l in back)+''.join(photo(i,x,535,215) for i,x,l in front)) if FACES else (''.join(person(i,x,300,0.95,l,"#4a1a12") for i,x,l in back)+''.join(person(i,x,560,1.45,l,"#2e130e") for i,x,l in front)+mic(380,880,1)+mic(800,890,1)+mic(1120,890,-1)+mic(1540,880,-1))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="Heebo, Arial, sans-serif">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a1f"/><stop offset=".5" stop-color="#ff5a1f"/><stop offset="1" stop-color="#d1121f"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<linearGradient id="rim" x1="0" x2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff3fa4"/></linearGradient>
<pattern id="grill" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2a2a2a"/><circle cx="4" cy="4" r="2" fill="#444"/></pattern>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd60a"/><stop offset="1" stop-color="#ff2d87"/></linearGradient><filter id="pdrop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".55"/></filter><filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="rough"><feTurbulence baseFrequency=".035" numOctaves="3" seed="3"/><feDisplacementMap in="SourceGraphic" scale="28"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>{bokeh}{strokes}
<path d="M960,960 L-340,960 L-335,847 Z" fill="#ffd60a" fill-opacity=".05"/><path d="M960,960 L-301,646 L-269,537 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L-188,350 L-130,252 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L-6,90 L73,9 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L233,-118 L330,-177 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L515,-262 L624,-296 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L824,-333 L937,-340 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L1141,-327 L1252,-307 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L1447,-245 L1550,-198 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L1724,-92 L1813,-21 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L1956,124 L2025,214 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L2128,390 L2174,494 Z" fill="#ffd60a" fill-opacity=".10"/><path d="M960,960 L2232,690 L2250,802 Z" fill="#ffd60a" fill-opacity=".10"/>{PEOPLE}
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".45" stop-color="#ffd60a"/><stop offset="1" stop-color="#ff8c00"/></linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3b30"/><stop offset="1" stop-color="#b3000c"/></linearGradient>
<filter id="glow" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="18" flood-color="#ffb000" flood-opacity=".75"/></filter>
<filter id="drop"><feDropShadow dx="6" dy="10" stdDeviation="6" flood-color="#000" flood-opacity=".6"/></filter>
<linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient>
</defs>
<rect x="0" y="700" width="1920" height="380" fill="url(#fadeB)"/>

<g transform="rotate(-4 960 960)">
<g filter="url(#drop)">
<path d="M520,800 L1250,780 L1240,850 L530,866 Z" fill="#000"/>
<path d="M520,800 L1250,780 L1250,786 L520,806 Z" fill="#ffd60a"/>
<text x="885" y="848" font-size="64" font-weight="900" text-anchor="middle" fill="#fff" letter-spacing="2">בגג של</text>
</g>
<text x="1014.4" y="1049.2" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1013.2" y="1047.6" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1012.0" y="1046.0" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1010.8" y="1044.4" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1009.6" y="1042.8" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1008.4" y="1041.2" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1007.2" y="1039.6" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1006.0" y="1038.0" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1004.8" y="1036.4" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1003.6" y="1034.8" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1002.4" y="1033.2" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1001.2" y="1031.6" font-size="190" font-weight="900" text-anchor="middle" fill="#5a0a0a" stroke="#5a0a0a" stroke-width="14">הב״הדים</text><text x="1000" y="1030" font-size="190" font-weight="900" text-anchor="middle" fill="url(#gold)" stroke="#000" stroke-width="16" paint-order="stroke" filter="url(#glow)">הב״הדים</text><text x="1000" y="1030" font-size="190" font-weight="900" text-anchor="middle" fill="url(#shine)">הב״הדים</text>
</g>
<g transform="rotate(10 470 900)" filter="url(#drop)">
<polygon points="605,900 566,919 595,952 551,954 565,995 524,981 522,1025 489,996 470,1035 451,996 418,1025 416,981 375,995 389,954 345,952 374,919 335,900 374,881 345,848 389,846 375,805 416,819 418,775 451,804 470,765 489,804 522,775 524,819 565,805 551,846 595,848 566,881" fill="#000"/>
<polygon points="588,900 554,917 579,945 542,948 553,983 518,972 515,1009 487,984 470,1018 453,984 425,1009 422,972 387,983 398,948 361,945 386,917 352,900 386,883 361,855 398,852 387,817 422,828 425,791 453,816 470,782 487,816 515,791 518,828 553,817 542,852 579,855 554,883" fill="url(#red)" stroke="#ffd60a" stroke-width="6"/>
<text x="470" y="935" font-size="96" font-weight="900" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke" direction="ltr">#29</text>
</g>
<g fill="#fff">
<path d="M1580,830 l10,-38 l10,38 l38,10 l-38,10 l-10,38 l-10,-38 l-38,-10 Z"/>
<path d="M1500,1010 l6,-22 l6,22 l22,6 l-22,6 l-6,22 l-6,-22 l-22,-6 Z" opacity=".85"/>
<path d="M330,1030 l6,-22 l6,22 l22,6 l-22,6 l-6,22 l-6,-22 l-22,-6 Z" opacity=".85"/>
</g>
</svg>'''
open(OUT+".svg","w").write(svg)
open(OUT+".html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;800;900&display=swap" rel="stylesheet"><style>html,body{{margin:0;background:#000}}</style></head><body>{svg}</body></html>')
