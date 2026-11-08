"""Free local screen-based training video; source screenshots use synthetic records."""
import asyncio,json,math,subprocess,sys,wave,io,os
from pathlib import Path
from functools import lru_cache
import create_video as b
from PIL import Image,ImageDraw
b.font=lru_cache(maxsize=64)(b.font)
A=b.OUT/'admin-assets';A.mkdir(exist_ok=True)
T=Path(os.environ.get('DISCOVERSALAH_VIDEO_TEMP',str(A)));T.mkdir(exist_ok=True)
STORY=json.loads((b.OUT/'admin-story.json').read_text(encoding='utf-8'))
FPS=24;W=1600;H=900
ORDER=list(range(62))
ORDER.insert(ORDER.index(46),62)
ORDER.insert(ORDER.index(48),63)
ORDER.insert(ORDER.index(45),64)
ORDER.insert(ORDER.index(59),65)
def fit(d,text,box,size=25,color=b.INK,bold=False):
    while size>15 and len(b.wrapped(d,text,b.font(size,bold),box[2]-box[0]-24))*(size+9)>box[3]-box[1]:size-=1
    b.center(d,text,box,size,color,bold)

async def speech():
    sem=asyncio.Semaphore(2)
    async def one(i):
        p=A/f'voice-{i:02}.mp3'
        if p.exists() and p.stat().st_size>1000:return
        async with sem:
            for attempt in range(3):
                try:
                    await b.edge_tts.Communicate(STORY[i][3],'ur-PK-AsadNeural',rate='+28%').save(str(p))
                    print('Voice',i+1,flush=True);return
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2)
    await asyncio.gather(*(one(i) for i in range(len(STORY))))

@lru_cache(maxsize=90)
def screenshot(name):return Image.open(A/(name+'.png')).convert('RGB')

def frame(i,t,duration,shots):
    name,title,kicker,urdu,caption=STORY[i]
    im=Image.new('RGB',(W,H),b.MINT);d=ImageDraw.Draw(im)
    d.rectangle((0,0,W,80),fill=b.GREEN)
    d.text((32,22),'DiscoverSalah  /  Admin dashboard guide',font=b.font(29,True),fill='white')
    d.rounded_rectangle((1240,19,1568,61),radius=15,fill='#FFFFFF')
    b.center(d,'FOCAL SESSION' if name.startswith('rep-') and name!='rep-assignment' else 'ADMIN TRAINING',(1245,19,1563,60),22,b.GREEN,True)
    # Real UI stays large; a gentle focus zoom helps viewers read the active control.
    source=screenshot(name);box=shots.get(name,{}).get('box')
    q=max(0,min(1,(t-.4)/.7));q=q*q*(3-2*q)
    zoom=1+.22*q if box and box['width']<700 else 1+.025*q
    cw=1150/zoom;ch=650/zoom
    cx=box['x']+box['width']/2 if box else 575
    cy=box['y']+box['height']/2 if box else 325
    x=max(0,min(1150-cw,cx-cw/2));y=max(0,min(650-ch,cy-ch/2))
    screen=source.crop((round(x),round(y),round(x+cw),round(y+ch))).resize((1150,650),Image.Resampling.BILINEAR)
    im.paste(screen,(420,105));d=ImageDraw.Draw(im)
    d.rounded_rectangle((418,103,1572,757),radius=8,outline='#A8CCB7',width=3)
    if box and t>.4:
        bx=420+(box['x']-x)*zoom;by=105+(box['y']-y)*zoom
        ex=bx+box['width']*zoom;ey=by+box['height']*zoom
        bx=max(423,bx-5);by=max(108,by-5);ex=min(1567,ex+5);ey=min(752,ey+5)
        if ex>bx and ey>by:
            d.rounded_rectangle((bx,by,ex,ey),radius=9,outline=b.GOLD,width=4)
            px=min(1550,ex-12);py=min(735,ey-8)
            r=12+5*math.sin(t*3)
            d.ellipse((px-r,py-r,px+r,py+r),outline=b.GREEN,width=3)
            d.polygon([(px,py),(px+5,py+22),(px+11,py+14),(px+21,py+14)],fill=b.GREEN,outline='white')
    d.rounded_rectangle((24,105,395,755),radius=22,fill='white',outline='#C6DDCE',width=2)
    d.ellipse((48,131,114,197),fill=b.GREEN)
    b.center(d,f'{ORDER.index(i)+1:02}',(48,131,114,197),30,'white',True)
    fit(d,kicker,(45,220,375,335),23,b.GREEN,True)
    fit(d,title,(44,350,375,505),39,b.DARK,True)
    # A short visual action cue remains readable independently of narration.
    cue=caption.split('. ')[0].rstrip('.')
    fit(d,cue,(45,530,375,685),23,b.GRAY)
    if i==2:
        # Illustrative phone, explicitly labelled; never a real secret or live code.
        d.rounded_rectangle((80,527,339,697),radius=18,fill=b.DARK,outline=b.GREEN,width=3)
        b.center(d,'AUTHENTICATOR',(88,536,330,570),18,'white',True)
        b.center(d,'DiscoverSalah',(88,574,330,603),19,'white')
        b.center(d,'123 456',(88,604,330,654),35,b.GOLD,True)
        b.center(d,'EXAMPLE CODE',(88,659,330,685),15,'white')
    d.rectangle((45,718,373,724),fill='#DFEDE3')
    d.rectangle((45,718,45+328*min(1,t/duration),724),fill=b.GREEN)
    d.rounded_rectangle((24,775,1575,879),radius=17,fill=b.DARK)
    fit(d,caption,(45,781,1553,871),27,'white')
    d.rectangle((0,893,W*(ORDER.index(i)+t/duration)/len(STORY),900),fill=b.GOLD)
    return im

def render():
    shots=json.loads((A/'shots.json').read_text())
    for item in STORY:
        if not (A/(item[0]+'.png')).exists():raise FileNotFoundError(item[0])
    records=[];audio=[];offset=0;srt=[]
    for position,i in enumerate(ORDER):
        item=STORY[i]
        wav=T/f'admin-voice-{i:02}.wav'
        b.run(['-i',str(A/f'voice-{i:02}.mp3'),'-ar','24000','-ac','1','-c:a','pcm_s16le',str(wav)])
        with wave.open(str(wav),'rb') as w:data=w.readframes(w.getnframes())
        frames=math.ceil((len(data)/48000+.42)*FPS);dur=frames/FPS
        audio.extend([b'\0\0'*7200,data,b'\0\0'*(round(dur*24000)-7200-len(data)//2)])
        records.append({'index':i,'start':offset,'duration':dur,'frames':frames,'screen':item[0],'title':item[1],'urdu':item[3],'english':item[4]})
        srt.append(f'{position+1}\n{b.stamp(offset+.3)} --> {b.stamp(offset+dur)}\n{item[4]}\n');offset+=dur
    narration=T/'admin-narration.wav'
    with wave.open(str(narration),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b''.join(audio))
    target=b.OUT/'DiscoverSalah-Admin-Guide.mp4'
    proc=subprocess.Popen([b.FF,'-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-r',str(FPS),'-i','pipe:0','-i',str(narration),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-pix_fmt','yuv420p','-af','volume=3dB,alimiter=limit=0.95:level=false','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(target)],stdin=subprocess.PIPE)
    previews=[];prev=None
    for position,r in enumerate(records):
        i=r['index']
        stable=frame(i,1.5,r['duration'],shots)
        recovery=None
        for f in range(r['frames']):
            if f>=36 and f%4:
                proc.stdin.write(encoded)
                continue
            t=f/FPS
            im=frame(i,t,r['duration'],shots) if f<36 else stable.copy()
            d=ImageDraw.Draw(im)
            d.rectangle((45,718,373,724),fill='#DFEDE3')
            d.rectangle((45,718,45+328*min(1,t/r['duration']),724),fill=b.GREEN)
            d.rectangle((0,893,W,899),fill=b.MINT)
            d.rectangle((0,893,W*(position+t/r['duration'])/len(STORY),899),fill=b.GOLD)
            if prev is not None and f<9:im=Image.blend(prev,im,f/9)
            buf=io.BytesIO();im.save(buf,format='PNG',compress_level=1);encoded=buf.getvalue()
            proc.stdin.write(encoded)
            if f==36:
                im.save(A/f'preview-{i:02}.jpg');thumb=im.copy();thumb.thumbnail((400,225));previews.append(thumb)
        prev=im;print('Rendered',i+1,'/',len(records),flush=True)
    proc.stdin.close()
    if proc.wait():raise RuntimeError('Encoding failed')
    (b.OUT/'Admin-Guide-English.srt').write_text('\n'.join(srt),encoding='utf-8')
    (b.OUT/'admin-guide-timing.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    (b.OUT/'Admin-Guide-Script.md').write_text('# DiscoverSalah — Admin dashboard guide\n\nTraining examples only. All timings and contacts are synthetic.\n\n'+'\n\n'.join(f'## {b.stamp(r["start"])[:8]} — {r["title"]}\n\n{r["urdu"]}\n\n{r["english"]}' for r in records),encoding='utf-8')
    chapters=['00:00 Introduction']
    for r in records:
        title=STORY[r['index']][2]
        if title[0].isdigit():chapters.append(b.stamp(r['start'])[3:8]+' '+title.split(' · ',1)[-1].title())
    (b.OUT/'Admin-Guide-Chapters.txt').write_text('\n'.join(chapters),encoding='utf-8')
    sheet=Image.new('RGB',(1600,math.ceil(len(previews)/4)*225),'white')
    for i,im in enumerate(previews):sheet.paste(im,(i%4*400,i//4*225))
    sheet.save(b.OUT/'admin-guide-preview.jpg')
    b.run(['-i',str(target),'-f','null','-'])
    for label,seconds in [('timing',records[8]['start']+2),('registration',records[35]['start']+2),('ending',offset-3)]:
        b.run(['-ss',str(seconds),'-i',str(target),'-frames:v','1',str(A/f'encoded-{label}.jpg')])
    print(json.dumps({'file':str(target),'seconds':offset,'mb':target.stat().st_size/1e6}),flush=True)

if __name__=='__main__':
    if '--preview' in sys.argv:
        shots=json.loads((A/'shots.json').read_text())
        for i in [2,10,16,22,33,55]:frame(i,2,10,shots).save(A/f'qa-{i:02}.jpg')
    else:
        if '--render' not in sys.argv:asyncio.run(speech())
        if '--speech' not in sys.argv:render()
