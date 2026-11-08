"""Sentence-matched motion storyboard; each recorded sentence has its own visual."""
import sys,asyncio,math,wave,json,subprocess
from functools import lru_cache
import create_video as b
from PIL import Image,ImageDraw
b.font=lru_cache(maxsize=64)(b.font)
A=b.OUT/'story-assets';A.mkdir(exist_ok=True)
FPS=24
STORY=[
('Naya area. Naye raste.','NEW TO THE AREA','arrival','آپ کسی نئے ایریا میں آئے ہیں۔ آس پاس کی گلیاں بھی نئی ہیں، اور راستوں کا بھی اندازہ نہیں۔','You arrive in a new area. The streets are unfamiliar, and you do not know your way around.'),
('Masjid kahan hai?','FIND A NEARBY MOSQUE','find','اب سوال ہے، قریب مسجد کہاں ہے؟ ڈسکور صلاح پر اپنی لوکیشن یا ایریا چوز کریں، اور لسٹ میں شامل قریبی مساجد تلاش کریں۔','Where is a nearby mosque? Choose your location or area in DiscoverSalah to find listed mosques nearby.'),
('Jama’at kitne bajay hai?','CHECK CONGREGATION TIMES','times','مسجد کی لوکیشن کے ساتھ، فجر سے عشاء تک نمازوں کی جماعت کے ٹائم بھی چیک کر لیں۔','Alongside the mosque location, check congregation times for prayers from Fajr to Isha.'),
('Prayer time ≠ Jama’at time','KNOW THE DIFFERENCE','difference','یاد رہے، نماز کا وقت شروع ہونا، اور مسجد میں جماعت شروع ہونا، الگ ہیں۔ یہاں فوکس جماعت کے ٹائم پر ہے۔','Prayer time beginning and congregation starting are different. The focus here is Jama’at time.'),
('Masjid mili. Ab rasta dekhein.','OPEN DIRECTIONS','directions','مسجد مل گئی اور ٹائم بھی دیکھ لیا؟ اب گوگل میپس کھولیں اور مسجد تک جانے کا راستہ دیکھ لیں۔','Found the mosque and checked the time? Open Google Maps for directions to its entrance.'),
('Thora extra time rakhein.','PLAN YOUR VISIT','buffer','نکلنے سے پہلے ٹائمنگ دوبارہ چیک کریں، اور سفر کے لیے کچھ ایکسٹرا ٹائم رکھیں۔ وقت پر پہنچنے کی گارنٹی نہیں ہوتی۔','Check the timing before leaving and allow extra travel time. Arrival on time is not guaranteed.'),
('Bas dekhein. Sign-up nahi.','EASY FOR EVERYONE','browse','سفر پر ہوں، نئے محلے میں ہوں، یا کام سے باہر نکلے ہوں۔ مسجد اور ٹائمنگ دیکھنے کے لیے اکاؤنٹ بنانے کی ضرورت نہیں۔','Travelling, new to the neighbourhood, or out for work? Browse mosque locations and timings without an account.'),
('Local log, local updates.','THE MOSQUE REPRESENTATIVE','representative','لیکن ٹائمنگ اپڈیٹ کون کرے گا؟ مسجد کا لوکل نمائندہ نئی ٹائمنگ یا تبدیلی شیئر کرے گا۔','Who updates the timings? The local mosque representative submits new timings or changes.'),
('Imam sahib se confirm.','THE FOCAL PERSON','reviewer','فوکل پرسن، یعنی معلومات چیک کرنے والا شخص، امام صاحب سے بات کر کے اپڈیٹ کا ریویو کرے گا۔','A focal person checks the update by speaking with the registered Imam.'),
('Team ki zimmedari clear.','THE ADMINISTRATOR','admin','ایڈمن یہ دیکھے گا کہ کس ایریا میں کون ذمہ دار ہے، تاکہ ٹیم مل کر کام کر سکے۔','The administrator assigns responsibilities across areas so the team can work together.'),
('Pehle check. Phir publish.','INDEPENDENT REVIEW','approve','کوئی اپنی اپڈیٹ خود اپروو نہیں کرے گا۔ دوسرا ذمہ دار شخص اسے چیک کر کے منظور کرے گا، یا اصلاح کے لیے واپس بھیجے گا۔','Nobody approves their own update. Another responsible person checks it, then approves or returns it for correction.'),
('Naya time, sahi tareekh se.','SCHEDULED CHANGES','calendar','اور اگر نئی ٹائمنگ کسی اگلی تاریخ سے شروع ہونی ہے، تو وہ اسی تاریخ سے لاگو ہوگی۔','If a new timetable starts on a future date, it takes effect on that date.'),
('Galat time? Bata dein.', 'REPORT AN ISSUE','report','آپ کو کوئی ٹائم غلط لگے، تو رپورٹ کر دیں۔ آپ کی ایک چھوٹی سی مدد، معلومات بہتر بنا سکتی ہے۔','See an incorrect time? Report it. A small contribution can help improve the information.'),
('Aap ki masjid missing hai?', 'SUGGEST A MOSQUE','suggest','آپ کی مسجد لسٹ میں نہیں؟ اسے سجیسٹ کریں، تاکہ ضروری چیک کے بعد اسے شامل کیا جا سکے۔','Your mosque is missing? Suggest it so it can be added after the required checks.'),
('Mil kar asaani banayein.', 'JOIN THE COMMUNITY','join','ساتھ کام کرنا چاہیں تو اپلائی کریں، اور اپنی درخواست کا اسٹیٹس چیک کرتے رہیں۔','Want to help? Apply to contribute and follow your request’s status.'),
('Private number, private hi.', 'RESPECT PEOPLE’S PRIVACY','privacy','اور ہاں، امام صاحب کے پرائیویٹ فون نمبرز سب کو نظر نہیں آئیں گے۔','Private Imam phone numbers are not shown to the public.'),
('Masjid bhi. Jama’at time bhi.', 'THAT IS DISCOVERSALAH','close','بس یہی ہے ڈسکور صلاح۔ نئے ایریا میں مسجد کی لوکیشن اور جماعت کے ٹائم آسانی سے ڈھونڈیں، اور اپنی کمیونٹی کی مدد کریں۔','DiscoverSalah: find mosque locations and Jama’at times in an unfamiliar area, and help your community.')]

def text(d,s,box,size=28,color=b.INK,bold=False):b.center(d,s,box,size,color,bold)
def panel(d,box,fill='white'):d.rounded_rectangle(box,radius=22,fill=fill,outline='#C7DECF',width=2)
def person(d,x,y,color=b.GREEN):
    d.ellipse((x-18,y-55,x+18,y-19),fill=color)
    d.rounded_rectangle((x-28,y-12,x+28,y+55),radius=20,fill=color)
def check(d,x,y,q=1,color=b.GREEN):
    pts=[(x-18,y),(x-3,y+15),(x+26,y-20)]
    if q<.4:pts=[pts[0],(pts[0][0]+15*q/.4,pts[0][1]+15*q/.4)]
    else:pts=[pts[0],pts[1],(pts[1][0]+29*min(1,(q-.4)/.6),pts[1][1]-35*min(1,(q-.4)/.6))]
    d.line(pts,fill=color,width=7)
def pin(d,x,y,q=1):
    y-=25*(1-q)**3
    d.polygon([(x-18,y),(x+18,y),(x,y+39)],fill=b.GREEN)
    d.ellipse((x-24,y-24,x+24,y+24),fill=b.GREEN)
    d.ellipse((x-8,y-8,x+8,y+8),fill='white')
def clock(d,x,y,r,t):
    d.ellipse((x-r,y-r,x+r,y+r),fill='white',outline=b.GREEN,width=6)
    for j in range(12):
        a=j*math.pi/6;d.line((x+math.sin(a)*r*.8,y-math.cos(a)*r*.8,x+math.sin(a)*r*.9,y-math.cos(a)*r*.9),fill=b.GREEN,width=3)
    a=t*.75;d.line((x,y,x+math.sin(a)*r*.64,y-math.cos(a)*r*.64),fill=b.GREEN,width=5)
    d.line((x,y,x-r*.35,y-r*.15),fill=b.DARK,width=6)
def arrow(d,x,y):
    d.line((x,y,x+60,y),fill=b.GREEN,width=5);d.polygon([(x+60,y),(x+46,y-10),(x+46,y+10)],fill=b.GREEN)
def mapview(d,t,find=True,route=False):
    panel(d,(65,224,690,542),'#DCEDE2')
    for x in (155,330,535):d.line((x,239,x,525),fill='#FAFCFA',width=16)
    for y in (303,415):d.line((80,y,674,y),fill='#FAFCFA',width=16)
    if route:
        pts=[(155,472),(155,415),(330,415),(330,303),(535,303)]
        lengths=[math.dist(a,c) for a,c in zip(pts,pts[1:])];total=sum(lengths);remaining=min(1,t/1.5)*total
        for (a,c),length in zip(zip(pts,pts[1:]),lengths):
            q=min(1,max(0,remaining/length));end=(a[0]+(c[0]-a[0])*q,a[1]+(c[1]-a[1])*q)
            if q:d.line([a,end],fill=b.GREEN,width=7)
            remaining-=length
        dist=(t*.2%1)*total
        for (a,c),length in zip(zip(pts,pts[1:]),lengths):
            if dist<=length:
                q=dist/length;x=a[0]+(c[0]-a[0])*q;y=a[1]+(c[1]-a[1])*q;d.ellipse((x-8,y-8,x+8,y+8),fill=b.GOLD);break
            dist-=length
    p=18+7*math.sin(t*3)**2;d.ellipse((155-p,472-p,155+p,472+p),outline='#83B995',width=3)
    d.ellipse((146,463,164,481),fill=b.DARK);d.text((179,460),'You',font=b.font(19,True),fill=b.DARK)
    if find:
        for j,(x,y) in enumerate([(535,275),(330,349),(155,275)]):pin(d,x,y,max(0,min(1,(t-j*.2)/.5)))
    d.text((83,512),'Location illustration',font=b.font(14),fill=b.GRAY)
def caption(im,s):
    d=ImageDraw.Draw(im);d.rounded_rectangle((40,570,1240,690),radius=20,fill=b.DARK);text(d,s,(65,580,1215,680),28,'white')

def frame(i,t,duration):
    title,kicker,kind,_,_=STORY[i]
    im=Image.new('RGB',(1280,720),b.MINT);d=ImageDraw.Draw(im)
    d.rectangle((0,0,1280,7),fill=b.GREEN)
    d.text((55,29),'DiscoverSalah',font=b.font(28,True),fill=b.GREEN)
    d.text((58,94),kicker,font=b.font(16,True),fill=b.GREEN)
    d.text((54,130),title,font=b.font(43,True),fill=b.INK)
    phase=min(1,max(0,t/.65));focus=min(2,int(t/max(1,duration/3)))
    if kind in ('arrival','find','directions','suggest'):
        mapview(d,t,kind!='arrival',kind=='directions')
        panel(d,(730,224,1215,542))
        if kind=='arrival':
            person(d,830+20*math.sin(min(t,2)),370)
            text(d,'?',(950,250,1140,390),90,b.GREEN,True)
            text(d,'New streets.\nWhere is the mosque?',(755,435,1190,520),27,b.INK,True)
        elif kind=='find':
            text(d,'Your location',(750,238,1190,294),30,b.GREEN,True)
            text(d,'↓',(750,294,1190,355),42,b.GREEN)
            text(d,'Nearby listed mosques',(740,354,1200,418),28,b.INK,True)
            text(d,'Choose an area or location',(750,451,1190,512),22,b.GRAY)
        elif kind=='directions':
            b.mosque(d,880,282,.48)
            text(d,'Open Google Maps',(740,430,1205,480),29,b.GREEN,True)
            text(d,'Directions to the entrance',(740,480,1205,526),23,b.GRAY)
        else:
            pin(d,972,305,phase);text(d,'+',(1050,260,1120,330),48,b.GREEN,True)
            text(d,'Suggest a mosque',(740,381,1205,443),30,b.GREEN,True)
            text(d,'Check first → add to the list',(740,455,1205,514),23,b.GRAY)
    elif kind=='times':
        b.mosque(d,155,300,.8)
        panel(d,(545,220,1215,547))
        text(d,'Prayer',(565,225,835,270),25,b.GREEN,True);text(d,'Jama’at',(875,225,1190,270),25,b.GREEN,True)
        prayers=['Fajr','Dhuhr','Asr','Maghrib','Isha'];selected=min(4,int(t/max(1,duration/5)))
        for j,p in enumerate(prayers):
            y=277+j*49
            if j==selected:d.rounded_rectangle((560,y,1200,y+44),radius=10,fill='#DCEDE2')
            d.text((585,y+6),p,font=b.font(23,True),fill=b.INK)
            d.text((930,y+7),'View time',font=b.font(22),fill=b.GREEN)
        text(d,'Mosque location + prayer timetable',(70,499,500,547),23,b.GREEN,True)
    elif kind in ('difference','buffer'):
        panel(d,(65,225,570,545));panel(d,(710,225,1215,545))
        clock(d,315,350,77,t);clock(d,960,350,77,t+1)
        if kind=='difference':
            text(d,'Prayer time begins',(80,450,555,520),30,b.INK,True);text(d,'Jama’at starts',(725,450,1200,520),30,b.GREEN,True)
            text(d,'≠',(570,290,710,420),75,b.GREEN,True)
        else:
            text(d,'Recheck the timing',(80,450,555,520),29,b.INK,True);text(d,'Allow travel time',(725,450,1200,520),29,b.GREEN,True)
            text(d,'+',(570,290,710,420),75,b.GREEN,True)
    elif kind=='browse':
        for j,(label,sub) in enumerate([('Travelling','New places'),('New neighbour','New surroundings'),('Out for work','Unfamiliar streets')]):
            x=65+j*397;panel(d,(x,240,x+360,480),'#DCEDE2' if focus==j else 'white');person(d,x+180,330)
            text(d,label,(x+10,395,x+350,439),27,b.INK,True);text(d,sub,(x+10,440,x+350,474),21,b.GRAY)
        text(d,'Browse locations and times • No account needed',(65,490,1215,548),28,b.GREEN,True)
    elif kind=='representative':
        person(d,245,355);text(d,'Local representative',(70,440,440,510),27,b.GREEN,True);arrow(d,430,352)
        panel(d,(580,229,1180,538));text(d,'Timing update',(610,242,1150,300),30,b.GREEN,True)
        for j,label in enumerate(['Mosque details','Prayer & Jama’at time','Submit for review']):
            y=322+j*62;d.line((625,y+24,625+int(330*min(1,max(0,(t-j*.35)/.7))),y+24),fill='#C7DECF',width=5)
            d.text((640,y-8),label,font=b.font(25),fill=b.INK)
    elif kind=='reviewer':
        person(d,245,350);person(d,1035,350)
        text(d,'Focal person',(70,437,430,505),30,b.GREEN,True);text(d,'Registered Imam',(850,437,1210,505),29,b.GREEN,True)
        panel(d,(505,252,775,472));text(d,'CALL',(510,270,770,333),32,b.GREEN,True)
        for j in range(5):
            x=565+j*36;h=15+35*abs(math.sin(t*4+j));d.rounded_rectangle((x,390-h,x+14,390+h),radius=7,fill=b.GREEN)
        d.line((300,345,505,345),fill='#9BC6A8',width=4);d.line((775,345,980,345),fill='#9BC6A8',width=4)
        text(d,'Check the update through a real conversation',(120,505,1160,552),24,b.INK,True)
    elif kind=='admin':
        person(d,640,267);text(d,'Admin',(520,325,760,372),29,b.GREEN,True)
        for j,label in enumerate(['Area A','Area B','Area C']):
            x=230+j*410;d.line((640,365,x,420),fill='#A6CDB3',width=4)
            panel(d,(x-140,416,x+140,541),'#DCEDE2' if focus==j else 'white')
            text(d,label,(x-120,424,x+120,472),27,b.GREEN,True);text(d,'Assigned local team',(x-130,478,x+130,528),21,b.GRAY)
    elif kind=='approve':
        for j,(label,sub) in enumerate([('Submit','Person 1'),('Review','Person 2'),('Decision','Approve / return')]):
            x=65+j*397;panel(d,(x,248,x+360,505),'#DCEDE2' if focus==j else 'white')
            if j<2:person(d,x+180,330)
            else:check(d,x+180,339,min(1,max(0,t/1.2)))
            text(d,label,(x+10,398,x+350,442),28,b.GREEN,True);text(d,sub,(x+10,448,x+350,492),23,b.GRAY)
        text(d,'Your own update needs someone else’s review',(65,508,1215,552),25,b.INK,True)
    elif kind=='calendar':
        panel(d,(150,225,650,541));d.rounded_rectangle((150,225,650,299),radius=22,fill=b.GREEN)
        text(d,'EFFECTIVE DATE',(160,232,640,289),29,'white',True)
        for j in range(14):
            x=183+j%7*64;y=326+j//7*75
            d.rounded_rectangle((x,y,x+47,y+49),radius=7,fill=b.GOLD if j==9 else '#E2EEE6')
        arrow(d,685,372);check(d,945,337,min(1,t/1.3))
        text(d,'New timing starts\non its planned date',(790,395,1205,521),31,b.GREEN,True)
    elif kind=='report':
        panel(d,(110,240,580,530));clock(d,345,352,70,t)
        text(d,'Timing looks wrong?',(120,450,570,516),29,b.INK,True);arrow(d,610,365)
        panel(d,(735,240,1190,530));d.polygon([(955,275),(895,385),(1015,385)],fill=b.GOLD)
        text(d,'!',(930,310,980,379),45,b.DARK,True)
        text(d,'Send a report',(745,435,1180,493),31,b.GREEN,True);text(d,'Help the team check it',(745,491,1180,530),21,b.GRAY)
    elif kind=='join':
        labels=['Apply','Under review','Track status']
        for j,label in enumerate(labels):
            x=65+j*397;panel(d,(x,250,x+360,505),'#DCEDE2' if focus==j else 'white')
            if j==0:person(d,x+180,340)
            elif j==1:clock(d,x+180,340,50,t)
            else:check(d,x+180,340,min(1,t))
            text(d,label,(x+10,421,x+350,485),29,b.GREEN,True)
    elif kind=='privacy':
        panel(d,(230,225,1050,543))
        d.arc((545,251,735,431),180,360,fill=b.GREEN,width=16)
        d.rounded_rectangle((535,332,745,453),radius=20,fill=b.GREEN)
        d.ellipse((628,365,652,389),fill=b.GOLD);d.rectangle((636,384,644,411),fill=b.GOLD)
        text(d,'Private phone numbers stay private',(250,468,1030,531),30,b.INK,True)
    else:
        b.mosque(d,160,294,.8)
        for j,(title,body) in enumerate([('Find the mosque','Nearby locations'),('Check Jama’at','Congregation times'),('Help others','Community care')]):
            y=222+j*110;panel(d,(565,y,1205,y+98),'#DCEDE2' if focus==j else 'white')
            text(d,title,(580,y+2,1190,y+47),29,b.GREEN,True);text(d,body,(580,y+47,1190,y+91),23,b.GRAY)
    return im

async def speech():
    sem=asyncio.Semaphore(2)
    async def one(i):
        p=A/f'{i:02}.mp3'
        if p.exists() and p.stat().st_size>1000:return
        async with sem:
            for attempt in range(3):
                try:
                    await b.edge_tts.Communicate(STORY[i][3],'ur-PK-AsadNeural',rate='+28%').save(str(p));print('Voice',i+1,flush=True);return
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2)
    await asyncio.gather(*(one(i) for i in range(len(STORY))))

def render():
    records=[];audio=[];offset=0;srt=[]
    for i,item in enumerate(STORY):
        wav=A/f'{i:02}.wav';b.run(['-i',str(A/f'{i:02}.mp3'),'-ar','24000','-ac','1','-c:a','pcm_s16le',str(wav)])
        with wave.open(str(wav),'rb') as w:data=w.readframes(w.getnframes())
        lead=.3;frames=math.ceil((len(data)/48000+lead+.12)*FPS);dur=frames/FPS
        audio.extend([b'\0\0'*7200,data,b'\0\0'*(round(dur*24000)-7200-len(data)//2)])
        records.append({'start':offset,'duration':dur,'frames':frames,'title':item[0],'visual':item[2],'urdu':item[3],'english':item[4]})
        srt.append(f'{i+1}\n{b.stamp(offset+lead)} --> {b.stamp(offset+dur)}\n{item[4]}\n');offset+=dur
    narration=A/'narration.wav'
    with wave.open(str(narration),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b''.join(audio))
    target=b.OUT/'DiscoverSalah-Visual-Story.mp4'
    proc=subprocess.Popen([b.FF,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','pipe:0','-i',str(narration),'-c:v','libx264','-preset','veryfast','-crf','21','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(target)],stdin=subprocess.PIPE)
    prev=None;previews=[];count=0;total=sum(r['frames'] for r in records)
    for i,r in enumerate(records):
        for f in range(r['frames']):
            t=f/FPS;im=frame(i,t,r['duration'])
            if prev is not None and f<7:
                q=f/7;q=q*q*(3-2*q);im=Image.blend(prev,im,q)
            if t>=.25:caption(im,r['english'])
            d=ImageDraw.Draw(im);d.rectangle((0,713,round(1280*(count+1)/total),720),fill=b.GOLD)
            proc.stdin.write(im.tobytes());count+=1
            if f==36:im.save(A/f'preview-{i:02}.png');previews.append(im.copy())
        prev=frame(i,t,r['duration']);print('Rendered visual',i+1,'/',len(records),flush=True)
    proc.stdin.close()
    if proc.wait():raise RuntimeError('Encoder failed')
    (b.OUT/'Visual-Story-English.srt').write_text('\n'.join(srt),encoding='utf-8')
    (b.OUT/'visual-story-timing.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    (b.OUT/'Visual-Story-Script.md').write_text('# DiscoverSalah — sentence-matched visual story\n\n'+'\n\n'.join(f'## {r["title"]}\nVisual: {r["visual"]}\n\nUrdu: {r["urdu"]}\n\nEnglish: {r["english"]}' for r in records),encoding='utf-8')
    sheet=Image.new('RGB',(1280,math.ceil(len(previews)/3)*240),'white')
    for i,im in enumerate(previews):im.thumbnail((426,240));sheet.paste(im,(i%3*426,i//3*240))
    sheet.save(b.OUT/'visual-story-preview.jpg')
    print(json.dumps({'file':str(target),'seconds':offset,'mb':target.stat().st_size/1e6}),flush=True)
if __name__=='__main__':
    if '--render' not in sys.argv:asyncio.run(speech())
    if '--speech' not in sys.argv:render()
