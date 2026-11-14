"""Renders the MoonChess launcher icons and splash screens into the Android project."""
import os
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
RES='/home/claude/moonchess-app/android/app/src/main/res'
OUT='/home/claude/moonchess-app/assets-src/out'; os.makedirs(OUT,exist_ok=True)
DENS={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':2000,'height':2000})
    pg.goto('http://localhost:8767/assets-src/icon.html');pg.evaluate('document.fonts.load("700 40px Orbitron")');pg.wait_for_timeout(300)
    def shot(mode,W,H,path):
        pg.set_viewport_size({'width':W,'height':H});pg.evaluate(f'draw("{mode}",{W},{H})');pg.wait_for_timeout(60)
        pg.screenshot(path=path,omit_background=True,clip={'x':0,'y':0,'width':W,'height':H})
    for m in ['bg','fg','mono','mc','mp']: shot(m,432,432,f'{OUT}/{m}.png')
    for d in ['port','land']:
        for k,f in DENS.items():
            src=Image.open(f'{RES}/drawable-{d}-{k}/splash.png');W,H=src.size
            shot('splash',W,H,f'{RES}/drawable-{d}-{k}/splash.png')
    shot('splash',480,320,f'{RES}/drawable/splash.png')
    b.close()
bg=Image.open(f'{OUT}/bg.png').convert('RGBA');fg=Image.open(f'{OUT}/fg.png').convert('RGBA');mono=Image.open(f'{OUT}/mono.png').convert('RGBA')
# themed icon: moon and pawn drawn separately, with a small gap cut around the pawn
from PIL import ImageFilter, ImageChops
mc=Image.open(f'{OUT}/mc.png').split()[3];mp=Image.open(f'{OUT}/mp.png').split()[3]
gap=mp.point(lambda v:255 if v>20 else 0).filter(ImageFilter.MaxFilter(15))
alpha=ImageChops.lighter(ImageChops.subtract(mc,gap),mp)
mono=Image.merge('RGBA',(Image.new('L',mc.size,255),)*3+(alpha,))
full=Image.alpha_composite(bg,fg)
for k,f in DENS.items():
    d=f'{RES}/mipmap-{k}';s=round(108*f)
    bg.resize((s,s),Image.LANCZOS).save(f'{d}/ic_launcher_background.png')
    fg.resize((s,s),Image.LANCZOS).save(f'{d}/ic_launcher_foreground.png')
    mono.resize((s,s),Image.LANCZOS).save(f'{d}/ic_launcher_monochrome.png')
    L=round(48*f);crop=full.crop((72,72,360,360)).resize((L,L),Image.LANCZOS)
    for name,shape in [('ic_launcher','sq'),('ic_launcher_round','ci')]:
        mask=Image.new('L',(L*4,L*4),0);dr=ImageDraw.Draw(mask)
        if shape=='sq': dr.rounded_rectangle((0,0,L*4-1,L*4-1),radius=L*4*.22,fill=255)
        else: dr.ellipse((0,0,L*4-1,L*4-1),fill=255)
        out=Image.new('RGBA',(L,L),(0,0,0,0));out.paste(crop,(0,0),mask.resize((L,L),Image.LANCZOS));out.save(f'{d}/{name}.png')
Image.alpha_composite(bg,fg).resize((512,512),Image.LANCZOS).save(f'{OUT}/play-store-icon-512.png')
print('done')
