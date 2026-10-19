/* Browser-side lifecycle. No provider API, API key, storage of prompts, or automatic model download. */
(function () {
  'use strict';
  class LocalModel {
    constructor(onProgress) {
      this.onProgress = onProgress;
      this.worker = null;
      this.ready = false;
      this.pending = null;
      this.sequence = 0;
      this.cancelCheck = null;
    }
    async checkSupport() {
      if (!navigator.gpu) throw new Error('此浏览器未开放 WebGPU，无法运行本地 AI。请使用支持 WebGPU 的设备与新版浏览器；今天吃什么仍可正常使用。');
      let adapter;
      try { adapter = await navigator.gpu.requestAdapter(); } catch (_) { /* Unsupported or restricted device. */ }
      if (!adapter) throw new Error('当前设备没有可用的 WebGPU 适配器，无法运行本地 AI。没有下载模型，也没有发送你的输入。');
      if (!adapter.features.has('shader-f16')) throw new Error('当前 GPU 不支持模型需要的 shader-f16。本次不会下载模型；请换用兼容设备。');
    }
    request(kind, payload, timeout) {
      if (this.pending) return Promise.reject(new Error('已有任务正在进行。'));
      const id = ++this.sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => this.stop('等待超时，已停止本次任务。可重试；模型缓存是否保留取决于浏览器。'), timeout);
        this.pending = { id, resolve, reject, timer };
        try { this.worker.postMessage({ id, kind, payload }); } catch (_) { this.stop('无法启动本地任务，请重试。'); }
      });
    }
    settle(message) {
      if (!this.pending || this.pending.id !== message.id) return;
      if (message.kind === 'progress') { this.onProgress(message.text); return; }
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      if (message.kind === 'error') {
        this.ready = false;
        this.worker?.terminate();
        this.worker = null;
        pending.reject(new Error(message.text || '本地 AI 运行失败，请重试。'));
      } else pending.resolve(message.text);
    }
    async prepare() {
      if (this.ready) return;
      this.onProgress('正在检查设备兼容性，尚未下载模型……');
      const attempt = this.sequence;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('设备检查超时，请重试。尚未下载模型。')), 15000);
        const cancel = () => { clearTimeout(timer); reject(new Error('已停止本次任务。')); };
        this.cancelCheck = cancel;
        this.checkSupport().then(resolve, reject).finally(() => { clearTimeout(timer); if (this.cancelCheck === cancel) this.cancelCheck = null; });
      });
      if (attempt !== this.sequence) throw new Error('已停止本次任务。');
      this.worker = new Worker(new URL('./model-worker.js', document.baseURI));
      this.worker.onmessage = event => this.settle(event.data);
      this.worker.onerror = () => this.stop('模型运行器无法启动。请检查网络、浏览器限制或可用内存后重试。');
      await this.request('load', null, 10 * 60 * 1000);
      this.ready = true;
    }
    async generate(payload) {
      await this.prepare();
      this.onProgress('模型已就绪，正在设备上生成。速度取决于设备，请稍候……');
      return this.request('generate', payload, 3 * 60 * 1000);
    }
    stop(message = '已停止本次任务。重试时会重新检查模型；已完成的缓存可能保留。') {
      this.sequence++;
      this.cancelCheck?.();
      this.cancelCheck = null;
      this.ready = false;
      this.worker?.terminate();
      this.worker = null;
      if (this.pending) {
        clearTimeout(this.pending.timer);
        this.pending.reject(new Error(message));
        this.pending = null;
      }
    }
  }
  window.LifeLocalModel = LocalModel;
})();
