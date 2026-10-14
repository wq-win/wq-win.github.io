#!/usr/bin/env python3
"""Check every article's embedded evidence assets and their provenance records.

This proves file/source/render agreement and editorial coverage, not every claim
in each paper or real-browser geometry. Visual inspection is separately recorded.
"""
from pathlib import Path
import json,hashlib,re,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SERIES={'rl':60,'llm':100,'robot-learn':100,'robot-classic':100}
checks=0;total=0;purpose={};kind={};allrows=[]
def check(v,label):
 global checks
 assert v,label
 checks+=1
class Figures(HTMLParser):
 def __init__(self):super().__init__();self.figures=[];self.current=None;self.links=[];self.details=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='details':self.details.append('open' in a)
  if tag=='figure' and 'reading-evidence-figure' in a.get('class',''):
   self.current={'images':[],'caption':'','sources':[],'inside_closed_details':False in self.details};self.figures.append(self.current)
  if tag=='a':self.links.append(a.get('href',''))
  if self.current is not None:
   if tag=='img':self.current['images'].append({**a,'zoom':self.links[-1] if self.links else ''})
   if tag=='a':self.current['sources'].append(a.get('href',''))
 def handle_endtag(self,tag):
  if tag=='a' and self.links:self.links.pop()
  if tag=='details' and self.details:self.details.pop()
  if tag=='figure':self.current=None
 def handle_data(self,text):
  if self.current is not None:self.current['caption']+=text
for series,count in SERIES.items():
 rows=[r for r in json.loads((ROOT/'data/reading-review-data.json').read_text())['inline'] if r['path'].startswith(series+'/')];allrows+=rows
 check(len(rows)==count,series+' exact paper count')
 check(len({r['path'] for r in rows})==count,series+' unique paper records')
 for r in rows:
  source=(ROOT/r['path']).read_text();slug=Path(r['path']).stem
  html=(ROOT/series/(slug+'.html')).read_text()
  article=re.search(r'<div id="article-body"[\s\S]*?<!-- READING:END -->',html).group()
  parser=Figures();parser.feed(article)
  figs=r['inline_figures']
  check(len(figs)>0,r['path']+' has useful inline figure')
  check(len(figs)==len(parser.figures),r['path']+' manifest matches figure blocks')
  check(any(not f['inside_closed_details'] for f in parser.figures),r['path']+' at least one figure visible without expanding details')
  check(r['existing_inline_count']+r['added_inline_count']==len(figs),r['path']+' existing/new image counts')
  check(isinstance(r['not_embedded'],list) and isinstance(r['limitations'],list),r['path']+' scope and limitations')
  for f in figs:
   asset=ROOT/f['asset_path'];rel='/'+f['asset_path']
   check(f['asset_path'].startswith(series+'/assets/'),str(asset)+' series-scoped asset')
   check(asset.is_file() and asset.stat().st_size>100,str(asset)+' nonempty asset')
   check(hashlib.sha256(asset.read_bytes()).hexdigest()==f['sha256'],str(asset)+' immutable figure hash')
   check(f['purpose'] in ['experiment','method','teaching'],str(asset)+' purpose classification')
   check(f['visual_type'] in ['quoted-figure','original-diagram','data-redraw'],str(asset)+' source type classification')
   check(bool(f['verified_visual']),str(asset)+' visual inspection recorded')
   check(f['source_url'].startswith(('https://','http://')) and f['source_locator'],str(asset)+' source and locator')
   check(f['license_status'] and f['attribution'],str(asset)+' rights and attribution')
   check(len(f['alt'])>=8 and len(f['commentary_summary'])>=8,str(asset)+' descriptive alt and commentary')
   found=[x for g in parser.figures for x in g['images'] if x.get('src')==rel]
   check(len(found)==1,str(asset)+' rendered inline once')
   img=found[0];check(img.get('alt')==f['alt'],str(asset)+' recorded alt matches rendered image')
   check(img.get('zoom')==rel,str(asset)+' click opens exact image for enlargement')
   check(img.get('loading')=='lazy',str(asset)+' defers offscreen loading')
   figure=next(g for g in parser.figures if img in g['images'])
   check(len(figure['caption'].strip())>=12,str(asset)+' visible contextual caption')
   check(any(x.startswith(('https://','http://')) for x in figure['sources']),str(asset)+' visible original-source link')
   if asset.suffix.lower()=='.svg':
    text=asset.read_text();root=ET.fromstring(text)
    check('viewBox' in root.attrib,str(asset)+' responsive SVG viewbox')
    check(not re.search(r'<(?:script|foreignObject)\b|onload=',text,re.I),str(asset)+' inert diagram SVG')
   else:
    with Image.open(asset) as image:
     width,height=image.size;image.verify()
    check(width>=100 and height>=60,str(asset)+' image is usable size')
    check(str(width)==img.get('width') and str(height)==img.get('height'),str(asset)+' declared intrinsic dimensions')
   purpose[f['purpose']]=purpose.get(f['purpose'],0)+1;kind[f['visual_type']]=kind.get(f['visual_type'],0)+1;total+=1
 for asset in (ROOT/series/'assets').rglob('*'):
  check(asset.suffix.lower()!='.pdf',str(asset)+' no full source PDF hosted')
check(len(allrows)==360,'all 360 paper articles covered')
print(f'{checks} inline evidence assertions passed: {len(allrows)} articles, {total} figures; purposes={purpose}; types={kind}. No visual-browser claim is implied.')
