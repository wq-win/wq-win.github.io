#!/usr/bin/env python3
"""Public, clone-reproducible figure reference checks; no private ledgers/history."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1];d=json.loads((ROOT/'data/reading-review-data.json').read_text());checks=0;counts={};missing=[]
def check(v,label):
 global checks
 assert v,label
 checks+=1
paths=set()
for l in d['figure_ledgers']:
 series=l['series'];counts[series]={'figures':0,'inline':0,'unavailable':0,'rights-limited':0,'tables':0}
 for a in l['articles']:
  check(a['path'] not in paths,'unique source '+a['path']);paths.add(a['path']);source=(ROOT/a['path']).read_text()
  for r in a['references']:
   if r['kind']=='table':counts[series]['tables']+=1;continue
   counts[series]['figures']+=1
   check(r['status'] in ['inline-existing','inline-added','unavailable','rights-limited'],a['path']+' figure has terminal editorial status '+r['id'])
   check(r['source_url'].startswith(('https://','http://')) and r['source_version'],a['path']+' identifiable source/version')
   if r['status'].startswith('inline-'):
    counts[series]['inline']+=1
    check(bool(r['asset_paths']),a['path']+' actual figure asset')
    check(bool(re.search(r'\bid=["\']'+re.escape(r['anchor'])+r'["\']',source)),a['path']+' actual figure anchor')
    for p in r['asset_paths']:check((ROOT/p).is_file() and '/'+p in source,a['path']+' image really in article '+p)
   else:
    counts[series][r['status']]+=1;check(bool(r['missing_reason']),a['path']+' precise missing-figure reason');missing.append((a['path'],r['figure_number'],r['status']))
  for f in a['new_figures']:
   p=ROOT/f['asset_path'];check(p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'],a['path']+' addition identity')
   check(f['attribution'] and f['license_status'],a['path']+' attribution and use basis')
check(len(paths)==376,'all 360 papers and 16 auxiliary source pages')
for r in d['coverage']:check(hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()==r['source_sha256'],r['path']+' public audit agrees with source')
check(sum(r['self_test_question_count'] for r in d['alignment'])==1020,'all 1020 historical end self-test records retained')
print(f'{checks} public figure-reference assertions passed. '+json.dumps(counts,ensure_ascii=False))
print(f'{len(missing)} original-figure references retain explicit access/editorial gaps; links alone are not counted as fulfilled.')
