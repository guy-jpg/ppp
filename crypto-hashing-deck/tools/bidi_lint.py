"""Flag Hebrew text elements that mix in Latin/digits/edge punctuation without an RLE wrapper."""
import re, sys, glob, os
heb = re.compile(r'[֐-׿]')
risky = re.compile(r'[A-Za-z0-9]')
for f in sorted(glob.glob(sys.argv[1] + '/*.html')):
    s = open(f, encoding='utf-8').read()
    s = re.sub(r'<aside>.*?</aside>', '', s, flags=re.S)
    for m in re.finditer(r'<(p|h[123])\b[^>]*>(.*?)</\1>', s, flags=re.S):
        inner = m.group(2)
        text = re.sub(r'<[^>]+>', '', inner)
        if not heb.search(text):
            continue
        if inner.startswith('&#8235;'):
            continue
        plain = text.replace('&amp;', '&').strip()
        edge = plain[:1] + plain[-1:]
        if risky.search(plain) or re.search(r'[^֐-׿]', edge):
            print(os.path.basename(f), '|', plain[:70])
    for m in re.finditer(r'<aside>(.*?)</aside>', open(f, encoding='utf-8').read(), flags=re.S):
        if not m.group(1).startswith('&#8235;'):
            print(os.path.basename(f), '| NOTES missing RLE')
