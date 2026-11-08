import sys, asyncio, subprocess, wave, json, math
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.video-tools'))
import edge_tts, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

OUT = ROOT / 'video'
ASSETS = OUT / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
# Each caption is translated from its own separately synthesized Urdu segment.
SCENES = [
('Find your local Jama’at', 'THE PURPOSE', [
('قریبی مسجد میں جماعت کا وقت کیا ہے؟ ڈسکور صلاح اسی سوال کا جواب آسان بناتی ہے۔', 'What time is Jama’at at a nearby mosque? DiscoverSalah makes that easier to find.'),
('یہ کمیونٹی کی مدد سے چلنے والی ویب ایپ ہے، جہاں شریک مساجد کے اصل جماعت کے اوقات دیکھے جا سکتے ہیں۔', 'A community-maintained website for actual congregation times at participating mosques.'),
('نماز کا وقت شروع ہونا، اور مسجد میں جماعت شروع ہونا، دو الگ باتیں ہیں۔', 'The beginning of a prayer time is different from the start of congregation.')]),
('Browse. Check. Get directions.', 'THE VISITOR JOURNEY', [
('عام صارف کو اکاؤنٹ کی ضرورت نہیں۔ اپنا علاقہ یا مقام منتخب کریں، پھر مسجد کے اوقات اور اعلانات دیکھیں۔', 'No account needed. Choose an area or location, then browse timetables and notices.'),
('راستے کے لیے گوگل میپس کھولیں۔ ڈسکور صلاح خود سفر کا دورانیہ نہیں بتاتی، اور وقت پر پہنچنے کی ضمانت نہیں دیتی۔', 'Open Google Maps for directions. DiscoverSalah provides no travel-time estimate or arrival guarantee.')]),
('A community that contributes', 'PUBLIC PARTICIPATION', [
('غلط معلومات کی رپورٹ کریں، کسی مسجد کی تجویز دیں، یا رضاکارانہ تعاون کے لیے درخواست جمع کرائیں۔', 'Report incorrect information, suggest a mosque, or apply to contribute.'),
('اپنی درخواست کی پیش رفت نجی طور پر دیکھیں۔ کوئی رپورٹ خود بخود منظور شدہ اوقات تبدیل نہیں کرتی۔', 'Track your request privately. Reports never automatically change approved timings.')]),
('Three roles. Clear responsibility.', 'THE PEOPLE', [
('مقامی نمائندہ مسجد کی معلومات برقرار رکھتا ہے، اور اوقات میں تبدیلی جمع کراتا ہے۔', 'The local representative maintains mosque information and submits timing changes.'),
('فوکل پرسن رجسٹرڈ امام سے رابطہ کر کے تبدیلی کا جائزہ لیتا ہے۔', 'The focal person reviews changes after contacting the registered Imam.'),
('ایڈمن علاقوں، عملے اور ذمہ داریوں کا انتظام کرتا ہے۔ ہر کردار کا اختیار محدود اور واضح ہے۔', 'The administrator manages areas, staff and assignments. Each role has a defined scope.')]),
('Verification before publication', 'THE APPROVAL PROCESS', [
('نمائندے کی جمع کردہ تبدیلی، امام سے گفتگو کے ریکارڈ کے ساتھ، آزاد جائزے سے گزرتی ہے۔', 'A submitted change receives independent review with recorded Imam-call evidence.'),
('جائزہ لینے والا اسے منظور، واپس یا مسترد کرتا ہے۔ کوئی شخص اپنی ہی تبدیلی منظور نہیں کر سکتا۔', 'The reviewer approves, returns or rejects it. Nobody can approve their own submission.'),
('مستقبل کے لیے منظور شدہ اوقات، اپنی مقررہ تاریخ سے نافذ ہوتے ہیں۔', 'Future-approved timings become effective on their scheduled date.')]),
('Private data stays private', 'SECURITY & TECHNOLOGY', [
('عملے کے لیے سائن اِن، اور ایڈمن کے لیے اضافی تصدیق موجود ہے۔ امام کے نجی رابطے عوامی صفحات پر ظاہر نہیں ہوتے۔', 'Staff sign in; administrators use MFA. Private Imam contacts stay off public pages.'),
('ری ایکٹ کا انٹرفیس، نوڈ اور ایکسپریس کا سرور، اور مونگو ڈی بی، معلومات اور کارروائیوں کو مربوط کرتے ہیں۔', 'React, Node and Express, and MongoDB connect the interface, workflows and stored records.')]),
('Built locally. Preparing to launch.', 'CURRENT STATUS', [
('ڈسکور صلاح مقامی طور پر کام کرنے والی ایپ ہے۔ عوامی تعیناتی ابھی تیاری کے مرحلے میں ہے۔', 'DiscoverSalah works locally. Public deployment is still being prepared.'),
('مفت پائلٹ کے لیے ہوسٹنگ، مقررہ وقفوں سے اطلاعات، بیک اپ، اور آخری جانچ باقی ہیں۔', 'Free pilot hosting, scheduled notifications, backups and final checks remain.'),
('ڈسکور صلاح۔ جماعت کے مقامی اوقات تک آسان رسائی، کمیونٹی کی شمولیت اور واضح تصدیق کے ساتھ۔', 'DiscoverSalah. Local Jama’at times, community participation and clear verification.')])]

GREEN='#146B4A'; DARK='#123D30'; MINT='#EDF6F0'; INK='#172B23'; GRAY='#52635B'; GOLD='#E5B557'
def font(n,bold=False): return ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',n)
def wrapped(d,text,f,width):
    if '\n' in text:
        return [line for para in text.split('\n') for line in wrapped(d,para,f,width)]
    lines=[]; cur=''
    for word in text.split():
        nxt=(cur+' '+word).strip()
        if d.textlength(nxt,font=f)>width and cur: lines.append(cur); cur=word
        else: cur=nxt
    return lines+[cur]
def center(d,text,box,size=25,color=INK,bold=False):
    f=font(size,bold); lines=wrapped(d,text,f,box[2]-box[0]-24); h=len(lines)*(size+9)
    for j,line in enumerate(lines):
        d.text(((box[0]+box[2]-d.textlength(line,font=f))/2,(box[1]+box[3]-h)/2+j*(size+9)),line,font=f,fill=color)
def card(d,x,y,w,h,title,body,num):
    d.rounded_rectangle((x,y,x+w,y+h),radius=20,fill='white',outline='#D6E7DC',width=2)
    d.ellipse((x+22,y+23,x+65,y+66),fill=GREEN)
    center(d,str(num),(x+22,y+23,x+65,y+66),20,'white',True)
    d.text((x+82,y+28),title,font=font(24,True),fill=INK)
    center(d,body,(x+15,y+83,x+w-15,y+h-15),25,GRAY)
def mosque(d,x,y,s=1):
    def box(a,b,c,e): return (x+a*s,y+b*s,x+c*s,y+e*s)
    d.rectangle(box(30,100,240,240),fill=GREEN)
    d.pieslice(box(50,0,220,170),180,360,fill=GREEN)
    d.rectangle(box(50,78,220,108),fill=GREEN)
    d.rounded_rectangle(box(108,145,164,240),radius=int(28*s),fill=MINT)
    for a in [0,250]:
        d.rectangle(box(a,45,a+22,240),fill=DARK)
        d.polygon([(x+(a-5)*s,y+45*s),(x+(a+11)*s,y+5*s),(x+(a+27)*s,y+45*s)],fill=GOLD)
    d.line([(x+135*s,y),(x+135*s,y-22*s)],fill=GOLD,width=3)
    d.ellipse(box(125,-40,145,-20),fill=GOLD)
    d.ellipse(box(131,-44,149,-26),fill=MINT)
def slide(si,caption,idx,total):
    title,kicker,_=SCENES[si]; im=Image.new('RGB',(1280,720),MINT); d=ImageDraw.Draw(im)
    d.rectangle((0,0,1280,8),fill=GREEN)
    d.text((58,30),'DiscoverSalah',font=font(26,True),fill=GREEN)
    d.text((1040,39),f'PROJECT OVERVIEW  /  {si+1:02}',font=font(13,True),fill=GRAY)
    d.text((58,99),kicker,font=font(16,True),fill=GREEN)
    d.text((55,132),title,font=font(43,True),fill=INK)
    if si==0:
        mosque(d,160,285,.85)
        card(d,560,240,650,122,'Participating mosques','Community-maintained information',1)
        card(d,560,380,650,122,'Actual Jama’at times','Prayer begins ≠ congregation starts',2)
    elif si==1:
        for j,(t,b) in enumerate([('Choose','Area or location'),('Discover','Timetables & notices'),('Navigate','External Google Maps')]): card(d,58+j*397,255,370,230,t,b,j+1)
    elif si==2:
        for j,(t,b) in enumerate([('Report','Help correct information'),('Suggest','Recommend a mosque'),('Contribute','Apply and track privately')]): card(d,58+j*397,255,370,230,t,b,j+1)
    elif si==3:
        for j,(t,b) in enumerate([('Representative','Maintain details\nSubmit changes'),('Focal person','Contact Imam\nReview changes'),('Administrator','Manage areas\nAssign staff')]): card(d,58+j*397,255,370,230,t,b,j+1)
    elif si==4:
        for j,(t,b) in enumerate([('Submit','Exact proposal'),('Verify','Record Imam call'),('Review','Approve / return / reject')]): card(d,58+j*397,230,370,195,t,b,j+1)
        d.rounded_rectangle((58,448,1220,514),radius=16,fill=DARK)
        center(d,'Independent review required  •  No self-approval',(58,448,1220,514),26,'white',True)
    elif si==5:
        for j,(t,b) in enumerate([('Frontend','React + TypeScript'),('API','Node + Express'),('Database','MongoDB')]): card(d,58+j*397,230,370,195,t,b,j+1)
        center(d,'Staff sign-in  •  Admin MFA  •  Private contacts protected',(58,443,1220,514),27,GREEN,True)
    else:
        card(d,58,235,560,225,'Implemented locally','Discovery, review workflows\nand staff access',1)
        card(d,650,235,570,225,'Deployment planned','Hosting, scheduled jobs,\nbackups and live checks',2)
        center(d,'Community participation. Clear verification.',(58,470,1220,530),26,GREEN,True)
    d.rounded_rectangle((40,565,1240,687),radius=18,fill=DARK)
    center(d,caption,(65,575,1215,674),28,'white')
    d.rectangle((0,711,int(1280*(idx+1)/total),720),fill=GOLD)
    return im

async def speech():
    voices=await edge_tts.list_voices()
    urdu=[v['ShortName'] for v in voices if v['Locale']=='ur-PK']
    print('Available Urdu voices:',urdu,flush=True)
    voice='ur-PK-AsadNeural' if 'ur-PK-AsadNeural' in urdu else urdu[0]
    sem=asyncio.Semaphore(2)
    async def one(i,text):
        path=ASSETS/f'{i:02}.mp3'
        if path.exists() and path.stat().st_size>1000:return
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text,voice,rate='+5%').save(str(path))
                    print('Narration ready',i,flush=True);return
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2)
    await asyncio.gather(*(one(i,t) for i,(_,t,_) in enumerate(segments)))

segments=[(si,u,e) for si,(_,_,items) in enumerate(SCENES) for u,e in items]
def run(args): subprocess.run([FF,'-hide_banner','-loglevel','error','-y']+args,check=True)
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
def render():
    offset=0;srt=[];records=[]
    for i,(si,u,e) in enumerate(segments):
        stem=ASSETS/f'{i:02}';mp3=stem.with_suffix('.mp3'); wav=stem.with_suffix('.wav')
        run(['-i',str(mp3),'-ar','24000','-ac','1',str(wav)])
        with wave.open(str(wav),'rb') as w: duration=w.getnframes()/w.getframerate()
        duration=math.ceil((duration+.25)*24)/24
        png=stem.with_suffix('.png');slide(si,e,i,len(segments)).save(png)
        part=stem.with_suffix('.mp4')
        run(['-loop','1','-framerate','24','-i',str(png),'-i',str(wav),'-t',str(duration),'-vf','fade=t=in:st=0:d=0.18,format=yuv420p','-af','apad','-c:v','libx264','-preset','ultrafast','-crf','22','-threads','2','-c:a','aac','-b:a','128k',str(part)])
        srt.append(f'{i+1}\n{stamp(offset)} --> {stamp(offset+duration)}\n{e}\n')
        records.append({'scene':si+1,'start':offset,'duration':duration,'urdu':u,'english':e})
        offset+=duration;print('Rendered',i+1,'/',len(segments),flush=True)
    manifest=ASSETS/'concat.txt';manifest.write_text('\n'.join(f"file '{i:02}.mp4'" for i in range(len(segments))),encoding='utf-8')
    final=OUT/'DiscoverSalah-Urdu-English.mp4'
    run(['-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(final)])
    (OUT/'DiscoverSalah-English.srt').write_text('\n'.join(srt),encoding='utf-8')
    (OUT/'timing.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    # Contact sheet of one actual rendered visual per scene.
    sheet=Image.new('RGB',(960,4*270),'#ffffff')
    for si in range(7):
        ix=next(i for i,s in enumerate(segments) if s[0]==si)
        im=Image.open(ASSETS/f'{ix:02}.png');im.thumbnail((480,270));sheet.paste(im,((si%2)*480,(si//2)*270))
    sheet.save(OUT/'preview.jpg')
    print(json.dumps({'file':str(final),'duration_seconds':offset,'size_mb':final.stat().st_size/1e6}),flush=True)

if __name__=='__main__':
    if '--render' not in sys.argv: asyncio.run(speech())
    if '--speech' not in sys.argv: render()
