"""Measure the final guide's loudness and peak level against the earlier guide."""
import json,subprocess,re
import create_video as b
results={}
for label,path in [('previous',b.OUT/'DiscoverSalah-Local-Representative-Guide.mp4'),('focal_original',b.OUT/'focal-assets/narration.wav'),('focal_final',b.OUT/'DiscoverSalah-Focal-Person-Guide.mp4')]:
    result=subprocess.run([b.FF,'-hide_banner','-i',str(path),'-vn','-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
    results[label]={key:float(value) for key,value in re.findall(r'(mean_volume|max_volume):\s*(-?[\d.]+) dB',result.stderr)}
if results['focal_final']['max_volume']>=0:raise RuntimeError('Audio peak reached full scale')
if results['focal_final']['mean_volume']<=results['focal_original']['mean_volume']:raise RuntimeError('Final voice is not louder')
(b.OUT/'focal-assets/audio-check.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
