'use strict';
// Created only after download consent and a successful main-thread GPU check.
importScripts('./config.js', './model-prompts.js');
let engine = null;
let activeId = null;
let running = false;
function errorText(error) {
  const message = String(error?.message || error || '');
  if (/context|token.*length|exceed.*token/i.test(message)) return '输入超过小模型可处理的长度，请缩短梦境后重试。';
  if (/integrity|hash|checksum/i.test(message)) return '模型文件校验失败，已停止。请稍后重试；不会运行校验失败的文件。';
  if (/device.*lost|webgpu|gpu|shader|memory|allocation|buffer/i.test(message)) return 'GPU 不可用、连接丢失或内存不足。已停止生成；请关闭其他占用内存的页面后重试，或使用兼容设备。';
  if (/cache|quota|indexeddb|storage/i.test(message)) return '浏览器模型缓存不可用或空间不足。请检查本站存储权限与可用空间后重试。';
  return '模型下载或本地运行失败。请检查网络、模型托管站的可用性和设备支持后重试。';
}
function fail(error) {
  if (activeId !== null) self.postMessage({ id: activeId, kind: 'error', text: errorText(error) });
}
self.addEventListener('unhandledrejection', event => { event.preventDefault(); fail(event.reason); });
self.onmessage = async event => {
  const { id, kind, payload } = event.data || {};
  if (!Number.isInteger(id) || running) return;
  activeId = id;
  running = true;
  try {
    if (kind === 'load') {
      const webllm = await import('./vendor/web-llm-0.2.85.js');
      const config = self.LIFE_MODEL_CONFIG;
      engine = new webllm.MLCEngine({
        logLevel: 'SILENT',
        appConfig: { model_list: [{
          model_id: config.modelId,
          model: config.model,
          model_lib: config.modelLib,
          required_features: ['shader-f16'],
          overrides: { context_window_size: 4096 },
          integrity: config.integrity
        }] },
        initProgressCallback: report => {
          const fraction = Number(report.progress);
          const percent = Number.isFinite(fraction) ? Math.round(Math.max(0, Math.min(1, fraction)) * 100) : 0;
          self.postMessage({ id, kind: 'progress', text: `正在下载／准备本地模型：${percent}%。首次加载可能需要数分钟；可随时停止。` });
        }
      });
      await engine.reload(config.modelId);
      self.postMessage({ id, kind: 'ready' });
    } else if (kind === 'generate') {
      if (!engine) throw new Error('Model not loaded');
      const messages = self.LifePrompts(payload);
      await engine.resetChat();
      const completion = await engine.chat.completions.create({
        messages,
        stream: false,
        max_tokens: 512,
        temperature: payload.type === 'fortune' ? 0.85 : 0.65,
        top_p: 0.9
      });
      const text = completion.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim() || text.length > 12000) throw new Error('Invalid output');
      // Keep prompts/results out of subsequent requests and never persist them.
      await engine.resetChat();
      self.postMessage({ id, kind: 'result', text });
    } else throw new Error('Invalid request');
  } catch (error) { fail(error); }
  finally { running = false; activeId = null; }
};
