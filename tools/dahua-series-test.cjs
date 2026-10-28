#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { ROOT, SERIES, posts, manifest, renderSource } = require('./build-dahua.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
(async () => {
    const { Window } = await import('happy-dom');
    const windows = [];
    function create(file, width = 390) {
        const window = new Window({url:'https://example.test/dahua-rl/' + file, width, height:844, settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableJavaScriptEvaluation:true}});
        windows.push(window);
        window.document.write(fs.readFileSync(path.join(SERIES,file),'utf8'));
        const style=window.document.createElement('style');
        style.textContent=['css/style.css','css/reading-guide.css','dahua-rl/css/series.css'].map(file=>fs.readFileSync(path.join(ROOT,file),'utf8')).join('\n');
        window.document.head.append(style);
        return window;
    }
    try {
        assert.equal(posts.length,5);
        assert.deepEqual(posts.map(post=>post.slug),['01-ddpg','02-ppo','03-td3','04-sac','05-tqc']);
        assert.equal(Object.keys(manifest.files).length,14,'exactly six Markdown and eight original image files');
        for(const [file,expected] of Object.entries(manifest.files)) assert.equal(hash(fs.readFileSync(path.join(SERIES,'posts',file))),expected,'source bytes: '+file);
        const search=JSON.parse(fs.readFileSync(path.join(ROOT,'data/search-index.json'),'utf8'));
        const entries=search.filter(item=>item.series==='dahua-rl');
        assert.equal(entries.length,6,'guide plus five articles indexed');
        const sitemap=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8');
        const guide={slug:'index',file:'README.md'};
        let formulaCount=0,displayCount=0,citationCount=0;
        for(const post of [guide,...posts]) {
            const window=create(post.slug+'.html'),doc=window.document,body=doc.getElementById('article-body');
            const original=fs.readFileSync(path.join(SERIES,'posts',post.file),'utf8');
            assert.equal(doc.getElementById('md-source').value,original,'embedded original source is exact');
            assert.equal(body.dataset.sourceSha256,manifest.files[post.file]);
            assert.equal(body.dataset.staticReading,'true','no JavaScript required for article text');
            assert.equal(doc.querySelectorAll('h1').length,1);
            assert.equal(doc.querySelectorAll('#article-body h2,#article-body h3').length,(original.match(/^#{2,3} /gm)||[]).length,'every section preserved');
            const rendered=renderSource(original);
            assert.equal(body.querySelectorAll('.reading-math').length,rendered.math.length);
            assert.equal(body.querySelectorAll('.katex-display').length,(original.match(/^\$\$/gm)||[]).length/2,'every display formula rendered');
            assert.equal(body.querySelectorAll('.reading-math-source,.katex-error').length,0,'no formula fallback');
            formulaCount+=rendered.math.length;
            displayCount+=body.querySelectorAll('.katex-display').length;
            const refs=Object.fromEntries([...original.matchAll(/^\[(\d+)\]:\s+(https?:\/\/\S+)\s*$/gm)].map(match=>[match[1],match[2]]));
            const labels=[...original.matchAll(/\[(\d+)\](?!:)/g)].filter(match=>refs[match[1]]).map(match=>match[1]);
            const citations=[...body.querySelectorAll('a')].filter(link=>/^\[\d+\]$/.test(link.textContent));
            assert.deepEqual(citations.map(link=>link.textContent.slice(1,-1)),labels,'all separate citation labels retained');
            citations.forEach(link=>assert.equal(link.getAttribute('href'),refs[link.textContent.slice(1,-1)],'citation destination'));
            citationCount+=citations.length;
            for(const el of doc.querySelectorAll('[href],[src]')) {
                const raw=el.getAttribute('href')||el.getAttribute('src');
                if(!raw||/^(?:https?:|data:|mailto:|tel:)/.test(raw)) continue;
                const target=new URL(raw,window.location.href);
                const file=path.join(ROOT,decodeURIComponent(target.pathname));
                assert(fs.existsSync(file),'local resource exists: '+raw+' in '+post.slug);
                if(target.hash && /\.html$/.test(target.pathname)) {
                    const targetHTML=fs.readFileSync(file,'utf8');
                    const id=decodeURIComponent(target.hash.slice(1));
                    assert(targetHTML.includes(`id="${id}"`),'local fragment exists: '+raw);
                }
            }
            const diagrams=(original.match(/^```mermaid\s*$/gm)||[]).length;
            assert.equal(body.querySelectorAll('.mermaid').length,diagrams,'all original Mermaid diagrams preserved');
            if(diagrams) {
                assert([...doc.scripts].some(script=>script.src.includes('mermaid@11')),'diagram library is loaded');
                assert([...doc.scripts].some(script=>script.textContent.includes("mermaid.run({querySelector:'.mermaid'})")),'every page containing a diagram initializes Mermaid');
            }
            const images=body.querySelectorAll('img');
            assert.equal(images.length,post.slug==='index'||post.slug==='03-td3'?0:1);
            images.forEach(img=>assert(img.alt,'figure alt text preserved'));
            assert(entries.some(item=>item.url==='dahua-rl/'+post.slug+'.html'));
            assert(sitemap.includes('https://wq-win.github.io/dahua-rl/'+post.slug+'.html'));
            if(post!==guide) {
                const index=posts.indexOf(post),links=[...doc.querySelectorAll('#article-pager a')].map(link=>link.getAttribute('href'));
                assert.deepEqual(links,[posts[index-1],posts[index+1]].filter(Boolean).map(item=>item.slug+'.html'));
            }
        }
        assert.equal(formulaCount,217);assert.equal(displayCount,138);
        for(const width of [320,390,1440]) {
            const window=create('01-ddpg.html',width),doc=window.document;
            window.fetch=async()=>({json:async()=>search});
            for(const file of ['site-config.js','search.js','site-chrome.js','reading-guide.js','reader.js']) window.eval(fs.readFileSync(path.join(ROOT,'js',file),'utf8'));
            window.SeriesChrome.mount({root:'../',active:'dahua-rl',seriesLabel:'大话强化学习算法'});
            window.SeriesReader.init({root:'../'});
            assert(doc.querySelector('#mobile-menu a[href="../dahua-rl/index.html"]'),'shared mobile nav entry');
            assert.equal(doc.querySelector('.rg-rail-intro a').getAttribute('href'),'index.html','reading guide link is real');
            assert.equal(doc.querySelectorAll('.rg-toc a').length,11);
            for(const dark of [false,true]) {
                doc.documentElement.classList.toggle('dark',dark);
                const expected=dark?'#192430':'#ffffff';
                assert.equal(window.getComputedStyle(doc.documentElement).getPropertyValue('--rg-paper').trim(),expected,'shared theme palette');
            }
            const bodyStyle=window.getComputedStyle(doc.getElementById('article-body'));
            assert.equal(bodyStyle.fontSize,width<=600?'15px':'16px','shared responsive type size');
            assert.equal(window.getComputedStyle(doc.querySelector('#article-body img')).maxWidth,'100%','figure constrained to reader column');
            doc.getElementById('mobile-menu-button').click();assert(doc.getElementById('mobile-menu').classList.contains('open'));
            doc.getElementById('close-menu-button').click();assert(!doc.getElementById('mobile-menu').classList.contains('open'));
            await window.SiteSearch.init('../');window.SiteSearch.bind();
            doc.getElementById('site-search-button').click();
            const input=doc.getElementById('site-search-input'),modal=doc.getElementById('site-search-modal');
            assert(!modal.classList.contains('hidden'));
            for(const post of posts) {
                input.value=post.title;input.dispatchEvent(new window.Event('input'));
                assert(doc.querySelector('.site-search-hit[href="../dahua-rl/'+post.slug+'.html"]'),'shared search finds '+post.slug);
            }
            input.value='no-result-zzzzzzzzz';input.dispatchEvent(new window.Event('input'));
            assert.equal(doc.querySelectorAll('.site-search-hit').length,0);
            doc.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(modal.classList.contains('hidden'));
            doc.getElementById('site-search-button').click();assert(!modal.classList.contains('hidden'),'search reopens');
            doc.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        }
        const home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
        assert.equal((home.match(/href="dahua-rl\/index\.html"/g)||[]).length,2,'homepage chip and series card');
        console.log(`Dahua checks passed: 14 original files, 6 pages, ${formulaCount} formulas (${displayCount} display), ${citationCount} distinct citation links; local links, pager, search, themes, mobile navigation at 320/390/1440 CSS viewports. DOM checks do not measure real-browser geometry.`);
    } finally { for(const window of windows) await window.happyDOM.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
