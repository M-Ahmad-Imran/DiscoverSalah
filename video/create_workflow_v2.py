"""Current-policy Urdu/English training modules. Synthetic screenshots only.
Usage: python video/create_workflow_v2.py --speech / --render / --preview
Audio cache keys include narration and voice settings, preventing stale narration.
"""
import asyncio, hashlib, json, math, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.video-tools'))
import edge_tts, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

OUT=ROOT/'video'; A=OUT/'workflow-v2-assets'; A.mkdir(exist_ok=True)
STORY=json.loads((OUT/'workflow-v2-story.json').read_text(encoding='utf-8'))
FF=imageio_ffmpeg.get_ffmpeg_exe()
GREEN='#146B4A'; MINT='#EDF6F0'; INK='#172B23'; GOLD='#E5B557'
def font(n,bold=False): return ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',n)
def lines(d,text,size,width,bold=False):
    result=[];line='';f=font(size,bold)
    for word in text.split():
        trial=(line+' '+word).strip()
        if d.textlength(trial,font=f)>width and line: result.append(line);line=word
        else: line=trial
    return result+[line]
def text(d,value,box,size=26,bold=False,color=INK):
    while True:
        rows=lines(d,value,size,box[2]-box[0],bold)
        if len(rows)*(size+10)<=box[3]-box[1] or size<=18: break
        size-=1
    for j,row in enumerate(rows):d.text((box[0],box[1]+j*(size+10)),row,font=font(size,bold),fill=color)
def key(role,i,item):return hashlib.sha256((item[3]+'ur-PK-AsadNeural+25%+12%').encode()).hexdigest()[:18]
def audio(role,i,item):return A/(key(role,i,item)+'.mp3')
async def speech():
    sem=asyncio.Semaphore(2)
    async def one(role,i,item):
        p=audio(role,i,item)
        if p.exists() and p.stat().st_size>1000:return
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(item[3],'ur-PK-AsadNeural',rate='+25%',volume='+12%').save(str(p))
                    print('Narration',role,i+1,flush=True);return
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2)
    await asyncio.gather(*(one(role,i,item) for role,items in STORY.items() for i,item in enumerate(items)))
def slide(role,i,item):
    title,cue,screen,urdu,caption=item
    im=Image.new('RGB',(1280,720),MINT);d=ImageDraw.Draw(im)
    d.rectangle((0,0,1280,74),fill=GREEN)
    d.text((30,20),'DiscoverSalah  |  '+role.replace('-',' ')+'  |  Updated guide',font=font(25,True),fill='white')
    d.rounded_rectangle((24,98,450,570),radius=20,fill='white')
    d.ellipse((46,118,106,178),fill=GREEN);d.text((62,129),str(i+1),font=font(30,True),fill='white')
    text(d,cue,(45,205,425,290),27,True,GREEN)
    text(d,title,(45,305,425,470),38,True)
    d.text((46,525),'CHECK  >  ACT  >  RECORD',font=font(19,True),fill=GREEN)
    if screen=='calendar':
        for x,n,label,detail in [(490,'7','DAYS','Representative checks'),(875,'14','DAYS','Focal calls or visits')]:
            d.rounded_rectangle((x,135,x+350,500),radius=20,fill='white',outline=GREEN,width=3)
            d.rectangle((x+3,138,x+347,195),fill=GREEN)
            d.text((x+145,210),n,font=font(85,True),fill=GREEN)
            d.text((x+135,320),label,font=font(26,True),fill=INK)
            text(d,detail,(x+25,380,x+325,475),27,True)
        d.line((844,320,870,320),fill=GREEN,width=5)
    else:
        p=A/(screen+'.png');source=Image.open(p).convert('RGB')
        # Show relevant current UI at a readable scale, without fitting an entire tall page.
        top={'confirmation':180,'published':140,'publish-preview':310,'follow-up':100,'focal-correction':1070}.get(screen,0)
        left=230 if screen in ('confirmation','published','publish-preview','follow-up','focal-correction') else 0
        height=480 if screen=='focal-correction' else 620
        crop=source.crop((left,top,source.width,min(source.height,top+height)))
        crop.thumbnail((760,470),Image.Resampling.LANCZOS)
        x=470+(780-crop.width)//2;y=98+(472-crop.height)//2
        im.paste(crop,(x,y));d=ImageDraw.Draw(im)
        d.rounded_rectangle((x-3,y-3,x+crop.width+3,y+crop.height+3),radius=8,outline=GOLD,width=3)
        d.text((495,574),'Synthetic example • No real accounts shown',font=font(16),fill=GREEN)
    d.rounded_rectangle((24,594,1256,704),radius=16,fill=INK)
    text(d,caption,(48,610,1230,694),25,False,'white')
    return im
def run(args):subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*args],check=True)
def duration(path):
    result=subprocess.run([FF,'-i',str(path)],capture_output=True,text=True)
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',result.stderr)
    if not m:raise RuntimeError('Missing audio duration: '+str(path))
    return int(m[1])*3600+int(m[2])*60+float(m[3])
def stamp(seconds):
    ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
def render():
    manifest=[]
    for role,items in STORY.items():
        folder=A/role;folder.mkdir(exist_ok=True);clips=[];captions=[];chapters=[];offset=0;script=[]
        for i,item in enumerate(items):
            sound=audio(role,i,item);dur=math.ceil((duration(sound)+.6)*24)/24
            png=folder/f'{i:02}.png';slide(role,i,item).save(png)
            clip=folder/f'{i:02}.mp4'
            # Gentle motion plus short fades in the theme colour; captions stay readable.
            vf=f"zoompan=z='min(zoom+0.00010,1.02)':d=1:s=1280x720:fps=24,fade=t=in:st=0:d=0.18:color=0xEDF6F0,fade=t=out:st={dur-.18}:d=0.18:color=0xEDF6F0,format=yuv420p"
            run(['-loop','1','-framerate','24','-i',str(png),'-i',str(sound),'-t',str(dur),'-vf',vf,'-af','apad,loudnorm=I=-16:TP=-1.5:LRA=9','-c:v','libx264','-preset','ultrafast','-crf','23','-threads','2','-c:a','aac','-b:a','128k',str(clip)])
            clips.append(clip);captions.append(f'{i+1}\n{stamp(offset)} --> {stamp(offset+dur)}\n{item[4]}\n')
            chapters.append(f'{stamp(offset)[:8]} {item[0]}');script.append(f'## {item[0]}\n\n{item[3]}\n\n{item[4]}')
            offset+=dur;print('Rendered',role,i+1,'/',len(items),flush=True)
        listing=folder/'concat.txt';listing.write_text(''.join("file '"+p.name+"'\n" for p in clips),encoding='utf-8')
        target=OUT/f'DiscoverSalah-{role}-Workflow-v2.mp4'
        run(['-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(target)])
        (OUT/f'{role}-Workflow-v2-English.srt').write_text('\n'.join(captions),encoding='utf-8')
        (OUT/f'{role}-Workflow-v2-Script.md').write_text('# '+role+' — current timetable workflow\n\n8 November 2026. Synthetic examples. Urdu narration / English captions.\n\n'+'\n\n'.join(script),encoding='utf-8')
        (OUT/f'{role}-Workflow-v2-Chapters.txt').write_text('\n'.join(chapters),encoding='utf-8')
        manifest.append({'role':role,'file':target.name,'seconds':offset,'bytes':target.stat().st_size})
    (OUT/'workflow-v2-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
def verify():
    manifest=json.loads((OUT/'workflow-v2-manifest.json').read_text(encoding='utf-8'))
    assert len(manifest)==len(STORY)
    for entry in manifest:
        path=OUT/entry['file']
        assert abs(duration(path)-entry['seconds'])<1, 'Unexpected duration: '+path.name
        run(['-i',str(path),'-map','0:v:0','-map','0:a:0','-f','null','-'])
        for suffix in ('English.srt','Script.md','Chapters.txt'):
            assert (OUT/(entry['role']+'-Workflow-v2-'+suffix)).stat().st_size>0
        print('Verified audio/video decode and companions:',path.name,flush=True)

if __name__=='__main__':
    if '--verify' in sys.argv:verify()
    elif '--preview' in sys.argv:
        for role,items in STORY.items():slide(role,0,items[0]).save(A/(role+'-preview.png'))
    else:
        if '--render' not in sys.argv:asyncio.run(speech())
        if '--speech' not in sys.argv:render()
