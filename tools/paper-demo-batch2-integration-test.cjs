'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const demos=[["rl", "dqn", "DQN：经验回放与目标网络", "真实小型神经网络如何从回放样本学习动作价值。", "16-dqn", "rl-dqn"], ["rl", "ppo", "PPO：裁剪代理目标", "比较正负优势下的概率比与裁剪目标，理解更新激励。", "27-ppo", "rl-ppo"], ["llm", "rope", "RoPE：旋转位置编码", "旋转查询和键，观察相对位置如何进入点积。", "046-rope", "llm-rope"], ["llm", "kv-cache", "KV Cache：Prefill 与 Decode", "因果注意力如何缓存旧 K/V，只为新 token 计算 Q/K/V。", "073-gqa", "llm-kv-cache"], ["robot-classic", "rrt-star", "RRT*：选择父节点与重连", "共享采样下对比 RRT 与 RRT*，观察路径成本传播。", "062-rrtstar", "classic-rrt-star"], ["robot-classic", "mpc", "MPC：预测、优化、只执行一步", "受约束小系统的滚动时域控制，与 PID 并排比较。", "094-cheetah-mpc", "classic-mpc"], ["robot-learn", "her", "HER：重新标记目标", "把实际到达的状态变成目标，重新计算奖励并回放。", "022-her", "learn-her"], ["robot-learn", "diffusion-policy", "Diffusion Policy：条件去噪动作", "在解析教学分布中逐步去噪动作序列，理解条件生成。", "061-diffusion-policy", "learn-diffusion-policy"]];
const ctx={window:{}};
for(const name of ['site-config','related-data'])vm.runInNewContext(fs.readFileSync(path.join(root,'js/'+name+'.js'),'utf8'),ctx);
const search=JSON.parse(fs.readFileSync(path.join(root,'data/search-index.json')));
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const [cat,id,title,description,paper,key] of demos){
 const url=`game/${cat}/${id}.html`,file=path.join(root,url),html=fs.readFileSync(file,'utf8');
 assert(html.includes('viewport'),'mobile viewport');
 assert(html.includes(`../../${cat}/${paper}.html`),`related article ${id}`);
 assert(fs.readFileSync(path.join(root,`game/${cat}/index.html`),'utf8').includes(`href="${id}.html"`),'category catalog');
 assert.equal(ctx.window.SITE.demos.filter(x=>x.href===url).length,1,'unique navigation');
 assert.equal(search.filter(x=>x.id==='game:'+key&&x.url===url).length,1,'unique search entry');
 assert(ctx.window.RELATED_PAPERS[`${cat}:${paper}`].some(x=>x.url===url),'article backlink');
 assert(sitemap.includes(url),'sitemap entry');
 assert(/<canvas|id="rope-plane0"|id="kv-matrix"/.test(html),'visualization surface');
 assert(/<label/.test(html),'adjustable labeled control');
 for(const m of html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)){
  const u=m[1];if(/^(https?:|data:|mailto:)/.test(u))continue;
  const dest=u.startsWith('/')?path.join(root,u):path.resolve(path.dirname(file),u.split(/[?#]/)[0]);
  assert(fs.existsSync(dest),`broken local asset ${url}: ${u}`);
 }
}
assert.equal(ctx.window.SITE.demos.filter(x=>x.cat).length,29,'exactly eight added to 21 baseline');
for(const [cat,count] of [['rl',7],['llm',7],['robot-classic',9],['robot-learn',6]])assert.equal(ctx.window.SITE.demos.filter(x=>x.cat===cat).length,count);
console.log('batch2 integration: 8 demos, navigation, paper backlinks, search, sitemap, local assets and 29 total PASS');
