#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {corpus}=require('./lib/reading-corpus.cjs');
const {syncSourceNavigation}=require('./lib/reading-navigation.cjs');
const root=path.resolve(__dirname,'..'),c=corpus(root),posts=c.catalogs.rl.posts;
let changed=0;
for(const post of c.papers.filter(p=>p.series==='rl')){
 const file=path.join(root,post.path),source=fs.readFileSync(file,'utf8');
 const updated=syncSourceNavigation(source,posts,post);
 if(source!==updated){fs.writeFileSync(file,updated);changed++;}
}
console.log(`Synchronized RL paper navigation: ${changed} sources updated. Update their public review hashes before verification.`);
