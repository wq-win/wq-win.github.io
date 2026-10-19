# Browser-local lifestyle AI

Dream and fortune use the actual WebLLM `MLCEngine` chat-completions API in a dedicated worker. There is no inference API, API key, backend proxy or template fallback. Food suggestions use the local curated recipe list.

## Download and execution

- Neither model nor runtime loads when a page opens. The form requires explicit consent to an approximately 300 MB initial download, local memory/GPU use and ordinary download-request metadata.
- Before creating the worker, check `navigator.gpu.requestAdapter()` and `shader-f16`. Unsupported devices get a clear error without downloading the runtime or model.
- The worker lazy-imports the unmodified, self-hosted official `@mlc-ai/web-llm@0.2.85` bundle. The engine reloads the pinned Qwen model, then receives the user's text only in a local worker message.
- Model assets are downloaded from Hugging Face and the official MLC binary repository. These hosts see ordinary network metadata, never prompts from this app. No telemetry or input/result storage is added. Runtime logging is SILENT.
- Only model artifacts are cacheable; browser eviction/private-mode/storage restrictions can cause repeated downloads. Offline availability is not promised.
- Context is bounded to 4096 tokens, generation to 512 tokens. Prompts include reflective/non-diagnostic dream guidance and entertainment-only fortune guidance (lucky number, color and direction). This small model may still make mistakes or omit requested fields.
- Stop and timeouts terminate the dedicated worker, also stopping unfinished downloads. Checking is bounded to 15 seconds, loading to 10 minutes, generation to 3 minutes. Device loss, cache failures, integrity failures and network failures are surfaced without fabricated results.

## Immutable artifacts

- Runtime: npm `@mlc-ai/web-llm@0.2.85`, file `lib/index.js`, vendored unchanged as `vendor/web-llm-0.2.85.js`.
- Runtime SHA-256: `341bae95822bfee1d0fd6a0e6cd2db8613bb8edf809390ac142fba36ec17792c`.
- Runtime license included at `vendor/LICENSE-web-llm.txt` (Apache-2.0).
- Model: `mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC`, Hugging Face revision `32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad`.
- WASM: `mlc-ai/binary-mlc-llm-libs` commit `00fe7a40e57e5e8eb9fef87526a4bf28ad5846c0`, `web-llm-models/v0_2_84/base/Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`.
- Model config, WASM and tokenizer integrity hashes are provided through WebLLM's supported `ModelRecord.integrity` fields, with `onFailure: 'error'`.
- Eight weight shards total 277,996,288 bytes. During preparation they matched the official manifest's byte lengths and MD5 checksums. Weight bytes are not bundled into the site; immutable revision URLs prevent accidental upstream drift. Do not claim SHA-256 enforcement for weight shards; that is not part of the provided WebLLM integrity interface.
- Total downloaded weights, tokenizer/config and WASM measured 294,438,545 bytes; runtime adds 6,586,947 bytes. Runtime's upstream VRAM estimate is 944.62 MB at 4096 context, not a measured peak process-memory guarantee.

## Verification and limitations

Run `npm run test:lifestyle` for UI, lifecycle and worker API-contract tests. Mock engines are deliberately synthetic and test wiring, not model quality or performance. The actual installed runtime's import, MLCEngine constructor, reload/resetChat and chat-completions API were checked without GPU inference.

The cloud browser used for verification exposes WebGPU but cannot obtain an adapter. Its actual unsupported-device flow is verified; no settings or security flags were changed to force GPU support. Real Chinese generation, latency, peak memory, cached reload, iPhone compatibility and output quality remain unverified on a capable device. The website should be described as a browser-local initial implementation requiring compatible hardware, not universally compatible or quality-certified.

## Primary sources

- https://webllm.mlc.ai/docs/user/basic_usage.html
- https://github.com/mlc-ai/web-llm/tree/v0.2.85
- https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC
- https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/main/LICENSE
