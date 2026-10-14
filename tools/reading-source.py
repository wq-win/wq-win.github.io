#!/usr/bin/env python3
"""Locate exact prerequisites in the current canonical Markdown edition.

Only rendered order changes. This manifest records the removed span and insertion
point for every paper so the renderer and independent preservation test can agree.
"""
from pathlib import Path
import re, json, hashlib
ROOT=Path(__file__).resolve().parents[1]
SERIES={'rl':60,'llm':100,'robot-learn':100,'robot-classic':100}
SPECIAL={
 'llm/002-nnlm':'理解这篇最需要掌握',
 'llm/004-word2vec':'理解本篇需要区分',
 'llm/005-negative-sampling':'理解本篇需要掌握',
 'llm/010-distillation':'理解本篇需要掌握',
 'robot-learn/015-gail':'**占用测度**描述策略',
}
LIST_ONLY={'robot-classic/'+s for s in ['085-dso','087-gpmp2','088-colmap','089-orbslam2','096-teaser']}
def blocks(text):
 return [(m.start()+len(m.group())-len(m.group().lstrip('\n')),m.end()-len(m.group())+len(m.group().rstrip('\n')),m.group().strip('\n')) for m in re.finditer(r'(?s)(?:[^\n]|\n(?!\n))+',text) if m.group().strip()]
def locate(text,key):
 bs=blocks(text)
 # Dedicated subsection owns the following body, ending at the next heading.
 hs=list(re.finditer(r'^### 五个前置概念[^\n]*\n',text,re.M))
 if hs:
  assert len(hs)==1,key
  start=hs[0].start(); endmatch=re.search(r'^#{1,3} ',text[hs[0].end():],re.M)
  end=hs[0].end()+endmatch.start() if endmatch else len(text)
  while end>start and text[end-1]=='\n':end-=1
  return start,end,'dedicated-subsection'
 if key in SPECIAL:
  start=text.index(SPECIAL[key]); end=next(e for s,e,b in bs if s<=start<e)
  return start,end,'exact-paragraph-or-sentence'
 if key in LIST_ONLY:
  header=next(i for i,(_,_,b) in enumerate(bs) if b.startswith('## ') and '前置概念' in b)
  choices=[(s,e) for s,e,b in bs[header+1:] if re.match(r'(?:1\.|-) ',b) and len(re.findall(r'^(?:\d\.|-) ',b,re.M))==5]
  assert len(choices)==1,(key,choices)
  return *choices[0],'five-item-list'
 pattern=re.compile(r'五[个项类].{0,10}概念|(?:前置|预备|基础)概念|五个术语')
 choices=[(i,s,e,b) for i,(s,e,b) in enumerate(bs) if not b.startswith(('#','|')) and pattern.search(b)]
 assert len(choices)==1,(key,[(i,b[:80]) for i,s,e,b in choices])
 i,s,e,b=choices[0]
 if len(b)<45 and b.endswith(('：',':')):
  ns,ne,nb=bs[i+1];assert re.match(r'(?:1\.|[-*]) ',nb),(key,nb)
  assert len(re.findall(r'^(?:\d\.|[-*]) ',nb,re.M))==5,(key,nb)
  e=ne
 return s,e,'existing-concept-block'
def insertion_point(text,key,start):
 """Place prerequisites at the narrative boundary, not after a legacy intro.

 A bridge is unnumbered and precedes the first problem-setting section. Put
 concepts between that bridge and the problem, before equations get deep.
 This also works if the source already put concepts at that boundary.
 """
 headings=list(re.finditer(r'^## (.+)$',text,re.M))
 assert len(headings)>1,key
 problem=next((h for h in headings if re.match(r'一[、.]\s*问题设定[：:]',h.group(1))),None)
 assert problem is not None,(key,'Missing the explicit problem-setting boundary')
 return min(problem.start(),start),'before-problem-setting'
def main():
 rows=[]
 for series,n in SERIES.items():
  ps=sorted(p for p in (ROOT/series/'posts').glob('*.md') if re.match(r'^\d{2,3}-',p.name) and 1<=int(p.name.split('-')[0])<=n)
  assert len(ps)==n,(series,len(ps))
  for p in ps:
   raw=p.read_bytes();text=raw.decode().replace('\r\n','\n');key=series+'/'+p.stem
   start,end,kind=locate(text,key)
   insert,insertion_kind=insertion_point(text,key,start)
   moved=text[start:end]
   rows.append(dict(key=key,source=str(p.relative_to(ROOT)),sourceSha256=hashlib.sha256(raw).hexdigest(),start=start,end=end,insert=insert,kind=kind,insertion_kind=insertion_kind,moved=moved,movedSha256=hashlib.sha256(moved.encode()).hexdigest()))
 out=ROOT/'data/reading-prerequisites.json';out.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print('Verified prerequisite locations:',len(rows))
if __name__=='__main__':main()
