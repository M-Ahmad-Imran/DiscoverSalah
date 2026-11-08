"""Friendly idea-only edition. Preserves the first video and its source assets."""
import sys, asyncio, wave, math, json, subprocess
from pathlib import Path
import create_video as base
from PIL import Image, ImageDraw, ImageFont
from functools import lru_cache

OUT=base.OUT
ASSETS=OUT/'animated-assets'
ASSETS.mkdir(exist_ok=True)
FPS=24
SCENES=[
('Naya area? Masjid kahan hai?', 'FIND A MOSQUE. CHECK JAMA’AT TIMES.', [
('سوچیں، آپ کسی نئے ایریا میں آئے ہیں۔ نہ پتا ہے قریب مسجد کہاں ہے، نہ یہ کہ وہاں نماز کی جماعت کتنے بجے ہوتی ہے۔', 'You arrive in a new area. Where is the nearest mosque, and when does Jama’at start?'),
('ڈسکور صلاح اسی مشکل کو آسان کرتی ہے۔ اپنے آس پاس لسٹ میں شامل مساجد کی لوکیشن دیکھیں، اور نمازوں کی جماعت کے ٹائم بھی چیک کر لیں۔', 'DiscoverSalah helps you find nearby listed mosque locations and check congregation times for prayers.')]),
('Apna area choose karein.', 'A FEW SIMPLE STEPS', [
('چاہے سفر پر ہوں، نئے محلے میں شفٹ ہوئے ہوں، یا کسی کام سے باہر آئے ہوں۔ اپنا ایریا یا لوکیشن چوز کریں، قریب کی لسٹ میں شامل مساجد اور ان کے جماعت کے ٹائم دیکھ لیں۔', 'Travelling, moving to a new neighbourhood, or out for work? Choose your location to find listed mosques and Jama’at times.'),
('ایک چھوٹی سی بات یاد رکھیں۔ نماز کا وقت شروع ہونا، اور مسجد میں جماعت ہونا، الگ الگ ہیں۔ یہاں فوکس جماعت کی ٹائمنگ پر ہے۔', 'Prayer time and congregation time are different. The focus here is Jama’at timings.')]),
('Masjid tak ka rasta? Easy.', 'FROM TIMINGS TO DIRECTIONS', [
('مسجد مل گئی، ٹائم بھی چیک ہو گیا؟ اب راستے کے لیے گوگل میپس کھول لیں۔ مسجد ڈھونڈنے سے لے کر وہاں جانے تک، بات آسان ہو جاتی ہے۔ اکاؤنٹ بھی نہیں چاہیے۔', 'Found the mosque and checked its Jama’at time? Open Google Maps for directions. No browsing account needed.'),
('نکلنے سے پہلے ٹائمنگ دوبارہ چیک کر لیں، اور سفر کے لیے کچھ ایکسٹرا ٹائم رکھیں۔ وقت پر پہنچنے کی گارنٹی نہیں ہوتی۔', 'Check the timing before leaving and allow extra travel time. Arrival on time is not guaranteed.')]),
('Timings kaun update karega?', 'PEOPLE FROM THE COMMUNITY', [
('یہ کام مل کر ہوگا۔ مسجد کا لوکل نمائندہ نئی ٹائمنگ یا کوئی تبدیلی شیئر کرے گا۔', 'It is a shared effort. A local mosque representative submits new timings or changes.'),
('فوکل پرسن، یعنی وہ شخص جو معلومات چیک کرتا ہے، امام صاحب سے بات کر کے اپڈیٹ کا ریویو کرے گا۔ ایڈمن ٹیم کو منظم رکھے گا۔', 'A focal person checks the update with the Imam. An admin helps organise the team.')]),
('Pehle check. Phir update.', 'A LITTLE CARE BUILDS TRUST', [
('ٹائمنگ صرف لکھ دینے سے پبلش نہیں ہوگی۔ ایک دوسرا ذمہ دار شخص اسے چیک کرے گا، پھر اپروو کرے گا یا اصلاح کے لیے واپس بھیجے گا۔', 'An update is checked by another responsible person before approval, or returned for correction.'),
('اس طرح کوئی اپنی ہی اپڈیٹ خود اپروو نہیں کرتا۔ اور اگلے دن سے لاگو ہونے والی ٹائمنگ، اسی دن سے دکھائی جاتی ہے۔', 'Nobody approves their own update. Future timings take effect on their planned date.')]),
('Aap bhi help kar sakte hain.', 'SMALL CONTRIBUTIONS MATTER', [
('کوئی ٹائم غلط لگے، یا آپ کی مسجد لسٹ میں نہ ہو، تو ہمیں بتائیں۔ آپ رپورٹ کر سکتے ہیں، یا مسجد سجیسٹ کر سکتے ہیں۔', 'Notice an incorrect time or a missing mosque? Send a report or suggest the mosque.'),
('ساتھ کام کرنا چاہیں تو تعاون کے لیے اپلائی کریں۔ اپنی درخواست کا اسٹیٹس بھی چیک کر سکتے ہیں۔ امام صاحب کے پرائیویٹ نمبرز سب کو نظر نہیں آئیں گے۔', 'Apply to help and track your request. Private Imam phone numbers are not shown publicly.')]),
('Apni masjid. Apni community.', 'THE IDEA IS SIMPLE', [
('مقصد بہت سادہ ہے۔ نیا ایریا ہو یا اپنا محلہ، مسجد کی لوکیشن اور جماعت کی ٹائمنگ آسانی سے مل جائے۔ اور کمیونٹی ایک دوسرے کی مدد کرے۔', 'A new area or your own neighbourhood: find mosque locations and Jama’at times, with help from the community.'),
('یہی ہے ڈسکور صلاح۔ اپنی مسجد سے جڑے رہیں، اور ایک چھوٹی سی مدد سے کسی اور کے لیے آسانی پیدا کریں۔', 'That is DiscoverSalah. Stay connected with your mosque and help make someone else’s day easier.')])]
SEGMENTS=[(s,u,e) for s,(_,_,items) in enumerate(SCENES) for u,e in items]
base.font=lru_cache(maxsize=32)(base.font)

def slide(si,caption,active):
    im=Image.new('RGB',(1280,720),base.MINT);d=ImageDraw.Draw(im)
    d.ellipse((980,-210,1430,240),fill='#E0EEE4')
    d.rectangle((0,0,1280,7),fill=base.GREEN)
    d.text((55,31),'DiscoverSalah',font=base.font(27,True),fill=base.GREEN)
    d.text((1040,39),'THE IDEA  /  '+str(si+1).zfill(2),font=base.font(15,True),fill=base.GRAY)
    d.text((58,101),SCENES[si][1],font=base.font(16,True),fill=base.GREEN)
    d.text((55,137),SCENES[si][0],font=base.font(44,True),fill=base.INK)
    if si in (0,6):
        base.mosque(d,190,294,.78)
        base.card(d,555,249,650,121,'Jama’at times','Find timings at participating mosques',1)
        base.card(d,555,389,650,121,'Community care','Local people. Checked information.',2)
    else:
        rows={
            1:[('Choose','Your area'),('Browse','Listed mosques'),('Check','Jama’at times')],
            2:[('Explore','Details & notices'),('Directions','Open Google Maps'),('Plan ahead','Allow extra time')],
            3:[('Local helper','Shares mosque updates'),('Reviewer','Checks with the Imam'),('Admin','Organises the team')],
            4:[('Share','Submit a change'),('Check','Another person reviews'),('Update','Approve or correct')],
            5:[('Report','Help correct a timing'),('Suggest','Add a missing mosque'),('Join in','Apply to help')],
        }[si]
        for j,(title,body) in enumerate(rows):
            x=58+j*397
            base.card(d,x,260,370,216,title,body,j+1)
        if si==4: base.center(d,'No self-approval. Every update gets a second look.',(55,489,1225,540),24,base.GREEN,True)
        elif si==5: base.center(d,'Private contacts stay private.',(55,489,1225,540),24,base.GREEN,True)
        elif si==1: base.center(d,'No sign-up needed to browse.',(55,489,1225,540),24,base.GREEN,True)
    # Captions are composed separately, keeping them steady while illustrations move.
    return im

async def speech():
    sem=asyncio.Semaphore(2)
    async def one(i,text):
        path=ASSETS/f'{i:02}.mp3'
        if path.exists() and path.stat().st_size>1000:return
        async with sem:
            for attempt in range(3):
                try:
                    await base.edge_tts.Communicate(text,'ur-PK-AsadNeural',rate='+16%').save(str(path))
                    print('Friendly narration ready',i+1,flush=True);return
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2)
    await asyncio.gather(*(one(i,u) for i,(_,u,_) in enumerate(SEGMENTS)))

def pin(d,x,y,scale=1):
    r=18*scale
    d.polygon([(x-r*.75,y+5),(x+r*.75,y+5),(x,y+r*1.8)],fill=base.GREEN)
    d.ellipse((x-r,y-r,x+r,y+r),fill=base.GREEN)
    d.ellipse((x-r*.35,y-r*.35,x+r*.35,y+r*.35),fill='white')

def animate(im,si,t):
    d=ImageDraw.Draw(im)
    if si<=2:
        d.rectangle((40,225,1240,555),fill=base.MINT)
        d.rounded_rectangle((58,232,620,540),radius=24,fill='#DCEDE2',outline='#C4DDCD',width=2)
        # A deliberately abstract location illustration, not a simulated live map.
        for x in (155,310,480): d.line((x,245,x,520),fill='#FAFCFA',width=17)
        for y in (305,410): d.line((75,y,602,y),fill='#FAFCFA',width=17)
        d.rounded_rectangle((335,325,450,390),radius=13,fill='#C2DCCB')
        d.rounded_rectangle((90,440,270,478),radius=13,fill='#C2DCCB')
        route=[(155,455),(155,410),(310,410),(310,305),(480,305)]
        # Route reveals over two seconds, then a gold marker travels along it.
        lengths=[math.dist(a,b) for a,b in zip(route,route[1:])];total=sum(lengths)
        remaining=min(1,max(0,(t-.3)/2))*total
        for (a,b),length in zip(zip(route,route[1:]),lengths):
            if remaining<=0:break
            q=min(1,remaining/length);end=(a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q)
            d.line([a,end],fill=base.GREEN,width=7);remaining-=length
        travel=((max(0,t-2.3)*.12)%1)*total
        for (a,b),length in zip(zip(route,route[1:]),lengths):
            if travel<=length:
                q=travel/length;x=a[0]+(b[0]-a[0])*q;y=a[1]+(b[1]-a[1])*q
                d.ellipse((x-7,y-7,x+7,y+7),fill=base.GOLD);break
            travel-=length
        pulse=17+9*(.5+.5*math.sin(t*2.8))
        d.ellipse((155-pulse,455-pulse,155+pulse,455+pulse),outline='#87BA9B',width=3)
        d.ellipse((147,447,163,463),fill=base.DARK)
        d.text((176,449),'You',font=base.font(18,True),fill=base.DARK)
        for j,(x,y) in enumerate([(480,277),(310,350),(155,278)]):
            q=max(0,min(1,(t-j*.25)/.65));ease=1-(1-q)**3
            pin(d,x,y-(1-ease)*30,.85 if j else 1.2)
        d.text((80,506),'Location illustration',font=base.font(15),fill=base.GRAY)
        right={0:[('Mosque kahan hai?','Find nearby listed mosques'),('Jama’at kab hai?','Check congregation times')],
               1:[('Your location','Choose an area or location'),('Prayer timings','Check the mosque timetable')],
               2:[('Mosque found','Location + Jama’at time'),('Get directions','Continue in Google Maps')]}[si]
        for j,(title,body) in enumerate(right):
            y=240+j*151
            d.rounded_rectangle((650,y,1220,y+135),radius=22,fill='white',outline='#BCD9C6',width=2)
            d.text((680,y+20),title,font=base.font(27,True),fill=base.GREEN)
            d.text((680,y+72),body,font=base.font(23),fill=base.GRAY)
            cx,cy=1172,y+40
            if j==1:
                d.ellipse((cx-20,cy-20,cx+20,cy+20),outline=base.GREEN,width=3)
                a=t*.6
                d.line((cx,cy,cx+13*math.sin(a),cy-13*math.cos(a)),fill=base.GREEN,width=3)
                d.line((cx,cy,cx-8,cy-5),fill=base.GREEN,width=3)
            else: pin(d,cx,cy,.72)
    elif si<6:
        # Animate responsibility and community cards in sequence.
        selected=int(t/2.8)%3
        x=58+selected*397
        d.rounded_rectangle((x,260,x+370,476),radius=20,outline=base.GREEN,width=4)
        for j in range(2):
            ax=435+j*397;ay=365
            d.line((ax,ay,ax+18,ay),fill=base.GREEN,width=3)
            d.polygon([(ax+18,ay),(ax+11,ay-5),(ax+11,ay+5)],fill=base.GREEN)
        q=(t%2.8)/2.8
        d.line((x+24,463,x+24+322*q,463),fill=base.GOLD,width=4)
    else:
        # Community connections gently pulse around the mosque.
        for j,(x,y) in enumerate([(120,325),(470,325),(115,493),(475,493)]):
            rad=7+3*(.5+.5*math.sin(t*2+j))
            d.line((x,y,295,415),fill='#BCD9C6',width=2)
            d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=base.GREEN)
        base.mosque(d,190,294,.78)

def render():
    records=[];offset=0;audio=[];srt=[]
    for i,(si,u,e) in enumerate(SEGMENTS):
        wav=ASSETS/f'{i:02}.wav'
        base.run(['-i',str(ASSETS/f'{i:02}.mp3'),'-ar','24000','-ac','1','-c:a','pcm_s16le',str(wav)])
        with wave.open(str(wav),'rb') as w: data=w.readframes(w.getnframes())
        spoken=len(data)/48000
        lead=.55 if i%2==0 else .08
        frames=math.ceil((lead+spoken+.2)*FPS)
        duration=frames/FPS
        tail=round(duration*24000)-round(lead*24000)-len(data)//2
        audio.extend([b'\0\0'*round(lead*24000),data,b'\0\0'*tail])
        srt.append(f'{i+1}\n{base.stamp(offset+lead)} --> {base.stamp(offset+duration)}\n{e}\n')
        records.append({'scene':si,'start':offset,'duration':duration,'lead':lead,'frames':frames,'urdu':u,'english':e})
        offset+=duration
    narration=ASSETS/'narration.wav'
    with wave.open(str(narration),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b''.join(audio))
    target=OUT/'DiscoverSalah-Animated-Idea.mp4'
    cmd=[base.FF,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','pipe:0','-i',str(narration),'-c:v','libx264','-preset','veryfast','-crf','21','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(target)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    prev=None;previous_scene=None;frame_count=0;total_frames=sum(r['frames'] for r in records)
    previews=[]
    for i,r in enumerate(records):
        si=r['scene'];scene=slide(si,r['english'],i%2)
        changed=si!=previous_scene
        # A true dissolve between chapters; no fades through black.
        transition=round(.55*FPS) if changed and prev is not None else 0
        caption_layer=Image.new('RGBA',(1280,720),(0,0,0,0));cd=ImageDraw.Draw(caption_layer)
        cd.rounded_rectangle((40,566,1240,686),radius=20,fill=base.DARK)
        base.center(cd,r['english'],(65,577,1215,676),28,'white')
        for f in range(r['frames']):
            t=f/FPS
            # Subtle rise-in motion in the illustration area, without moving captions.
            rise=round(16*max(0,1-min(t/1.2,1))**3) if changed else 0
            current=scene.copy()
            if rise:
                body=scene.crop((40,230,1240,548))
                ImageDraw.Draw(current).rectangle((40,230,1240,563),fill=base.MINT)
                current.paste(body,(40,230+rise))
            scene_time=r['start']-records[si*2]['start']+t
            animate(current,si,scene_time)
            if transition and f<transition:
                q=f/transition;q=q*q*(3-2*q)
                current=Image.blend(prev,current,q)
            alpha=min(1,max(0,(t-.18)/.35)) if changed else min(1,t/.2)
            layer=caption_layer.copy()
            if alpha<1: layer.putalpha(layer.getchannel('A').point(lambda x:int(x*alpha)))
            current.paste(layer,(0,0),layer)
            d=ImageDraw.Draw(current)
            d.rectangle((0,712,round(1280*(frame_count+1)/total_frames),720),fill=base.GOLD)
            proc.stdin.write(current.tobytes());frame_count+=1
            if f==round(1.5*FPS) and i%2==0:
                current.save(ASSETS/f'scene-{si+1}.png');previews.append(current.copy())
        prev=scene.copy();animate(prev,si,scene_time);previous_scene=si
        print('Rendered passage',i+1,'of',len(records),flush=True)
    proc.stdin.close()
    if proc.wait()!=0:raise RuntimeError('Video encoder failed')
    (OUT/'DiscoverSalah-Animated-English.srt').write_text('\n'.join(srt),encoding='utf-8')
    (OUT/'animated-timing.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    sheet=Image.new('RGB',(960,1080),'white')
    for i,im in enumerate(previews):
        im.thumbnail((480,270));sheet.paste(im,(i%2*480,i//2*270))
    sheet.save(OUT/'animated-preview.jpg')
    print(json.dumps({'file':str(target),'seconds':offset,'mb':target.stat().st_size/1e6}),flush=True)

if __name__=='__main__':
    if '--render' not in sys.argv: asyncio.run(speech())
    if '--speech' not in sys.argv: render()
