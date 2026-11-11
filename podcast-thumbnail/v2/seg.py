import numpy as np, onnxruntime as ort, json
from PIL import Image, ImageFilter
U="/root/.claude/uploads/a88e3f99-f233-5e5a-8e1a-77bfdfa2da54/"
sess=ort.InferenceSession("models/human.onnx")
# id: file, crop(display coords), head center, head width, neck cut y (None=keep body), zero-rect list
P={
"A":("4d0c082a-image.png",(150,330,880,1250),(600,590),330,770,[(640,940,880,1250)]),
"B":("c83e84e7-image.png",(90,420,860,1250),(430,840),360,1110,[]),
"C":("4efd2aae-image.png",(0,500,924,1830),(575,1050),470,1265,[(895,1150,924,1830),(0,1300,25,1830)]),
"D":("966cf2db-image.jpg",(700,150,1400,900),(1030,360),230,560,[]),
"E":("61428286-image.png",(60,130,880,1000),(470,560),440,900,[(60,130,215,560),(60,560,180,1000),(790,130,880,1000)]),
"F":("fcaa3838-image.jpg",(350,0,1000,560),(650,330),300,545,[]),
"G":("4456040f-image.png",(0,420,800,1250),(390,780),380,1120,[]),
"H":("3bfcd6fc-image.png",(60,320,924,1700),(600,790),420,None,[]),
"I":("e953b329-image.jpg",(200,560,720,1550),(420,760),230,912,[(528,660,720,900)]),
"J":("897c6143-image.jpg",(0,150,1093,1568),(560,900),650,1400,[(0,150,230,480),(0,1150,180,1568),(950,1300,1093,1568),(870,150,1093,700),(0,150,170,690),(0,150,95,1568),(960,700,1093,1300)]),
}
meta={}
for k,(f,cb,hc,hw,cut,zeros) in P.items():
    im=Image.open(U+f).convert("RGB")
    s=1.2662 if im.size==(1170,2532) else 1
    S=lambda v:int(v*s)
    cb=tuple(map(S,cb)); c=im.crop(cb)
    x=np.asarray(c.resize((320,320),Image.BILINEAR)).astype(np.float32)/255
    x=(x-[0.485,0.456,0.406])/[0.229,0.224,0.225]
    o=sess.run(None,{"input.1":x.transpose(2,0,1)[None].astype(np.float32)})[0][0,0]
    o=(o-o.min())/(o.max()-o.min()+1e-8)
    m=Image.fromarray((o*255).astype(np.uint8)).resize(c.size,Image.BILINEAR)
    m=np.asarray(m).astype(np.float32)/255
    m=np.clip((m-0.35)/0.3,0,1)
    if k=="E":
        from PIL import ImageDraw
        pts=[(470,150),(560,160),(640,200),(720,320),(752,480),(762,650),(772,800),(790,900),(200,900),(198,750),(196,600),(205,450),(232,300),(300,200),(380,160)]
        mm=Image.new("L",c.size,0); ImageDraw.Draw(mm).polygon([(S(x)-cb[0],S(y)-cb[1]) for x,y in pts],fill=255)
        m=np.asarray(mm.filter(ImageFilter.GaussianBlur(10))).astype(np.float32)/255
    for (x0,y0,x1,y1) in zeros:
        m[max(0,S(y0)-cb[1]):max(0,S(y1)-cb[1]), max(0,S(x0)-cb[0]):max(0,S(x1)-cb[0])]=0
    if cut:
        m[S(cut)-cb[1]:,:]=0
        hx,hy=S(hc[0])-cb[0],S(hc[1])-cb[1]-0.1*S(hw); rx=(0.95 if k=="J" else 0.8)*S(hw); ry=1.2*S(hw)
        yy,xx=np.mgrid[0:m.shape[0],0:m.shape[1]]
        e=((xx-hx)/rx)**2+((yy-hy)/ry)**2
        m*=np.clip((1.15-e)/0.15,0,1)
    a=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba=c.copy(); rgba.putalpha(a)
    bb=a.getbbox(); rgba=rgba.crop(bb)
    rgba.save(f"faces/{k}_cut.png")
    meta[k]=dict(hx=S(hc[0])-cb[0]-bb[0],hy=S(hc[1])-cb[1]-bb[1],hw=S(hw),cut=(S(cut)-cb[1]-bb[1]) if cut else None,w=rgba.size[0],h=rgba.size[1])
json.dump(meta,open("faces/meta.json","w"),indent=1)
# contact sheet on checker
sheet=Image.new("RGB",(2000,800),(40,160,60))
for i,k in enumerate(sorted(P)):
    t=Image.open(f"faces/{k}_cut.png"); t.thumbnail((400,400)); sheet.paste(t,((i%5)*400,(i//5)*400),t)
sheet.save("faces/cut_sheet.png")
