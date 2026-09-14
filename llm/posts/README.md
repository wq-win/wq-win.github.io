# 大语言模型：100 篇论文的思想与证据

语言模型的发展，既是表示能力的变化，也是数据、计算与评价方式的变化。从循环状态到注意力，从预训练到指令学习，从一次生成到检索、工具和验证，新的能力往往来自多个环节共同改变。理解论文的关键，是找到它真正修改的对象，并把性能结论放回数据与预算条件中。

[发展时间线与技术地图](00-发展时间线总览.md) · [跨论文总结与实验](101-系列总结.md)

## 阅读方法

每篇依次讨论问题与背景、方法与公式、算法流程、实验设计、证据强度、贡献代价和教学例子，最后提供自测题与参考答案。公式采用便于比较的记号；教学伪代码表达关键机制，不代替官方实现。研究结果、作者解释和本文分析分开表述。

先读 15 Transformer、18 BERT、35 GPT-3，可以建立预训练与上下文学习的框架；再读 47 LoRA、54 InstructGPT、75 DPO，区分参数适配与偏好优化；最后把 34 RAG、60 ReAct、91 推理计算扩展放在一起，理解模型之外的系统。需要历史脉络时，从第一篇顺序阅读。

年份以论文首次公开为原则，部分早期论文以正式发表年计；同年顺序兼顾先修关系。近期研究样例截至 2026 年 9 月 9 日，尚未形成与经典工作相同程度的复现积累。

## 论文目录

| 篇次 | 年份 | 论文 | 主线 |
|---|---|---|---|
| 001 | 1997 | [Long Short-Term Memory](001-lstm.md) | 序列建模 |
| 002 | 2003 | [A Neural Probabilistic Language Model](002-nnlm.md) | 序列建模 |
| 003 | 2010 | [Recurrent Neural Network Based Language Model](003-rnnlm.md) | 序列建模 |
| 004 | 2013 | [Efficient Estimation of Word Representations in Vector Space](004-word2vec.md) | 词表示 |
| 005 | 2013 | [Distributed Representations of Words and Phrases and their Compositionality](005-negative-sampling.md) | 词表示 |
| 006 | 2014 | [Sequence to Sequence Learning with Neural Networks](006-seq2seq.md) | 序列建模 |
| 007 | 2014 | [Neural Machine Translation by Jointly Learning to Align and Translate](007-attention.md) | 注意力 |
| 008 | 2014 | [GloVe: Global Vectors for Word Representation](008-glove.md) | 词表示 |
| 009 | 2014 | [Adam: A Method for Stochastic Optimization](009-adam.md) | 训练优化 |
| 010 | 2015 | [Distilling the Knowledge in a Neural Network](010-distillation.md) | 训练效率 |
| 011 | 2015 | [Neural Machine Translation of Rare Words with Subword Units](011-bpe.md) | 分词 |
| 012 | 2016 | [Layer Normalization](012-layernorm.md) | 训练优化 |
| 013 | 2016 | [Enriching Word Vectors with Subword Information](013-fasttext.md) | 词表示 |
| 014 | 2017 | [Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer](014-sparse-moe.md) | 稀疏架构 |
| 015 | 2017 | [Attention Is All You Need](015-transformer.md) | 注意力 |
| 016 | 2018 | [Deep Contextualized Word Representations](016-elmo.md) | 预训练 |
| 017 | 2018 | [Improving Language Understanding by Generative Pre-Training](017-gpt.md) | 预训练 |
| 018 | 2018 | [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](018-bert.md) | 预训练 |
| 019 | 2019 | [Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context](019-transformer-xl.md) | 长上下文 |
| 020 | 2019 | [Parameter-Efficient Transfer Learning for NLP](020-adapters.md) | 参数高效微调 |
| 021 | 2019 | [Language Models are Unsupervised Multitask Learners](021-gpt2.md) | 预训练 |
| 022 | 2019 | [XLNet: Generalized Autoregressive Pretraining for Language Understanding](022-xlnet.md) | 预训练 |
| 023 | 2019 | [RoBERTa: A Robustly Optimized BERT Pretraining Approach](023-roberta.md) | 数据与配方 |
| 024 | 2019 | [Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism](024-megatron.md) | 分布式训练 |
| 025 | 2019 | [ALBERT: A Lite BERT for Self-supervised Learning of Language Representations](025-albert.md) | 参数效率 |
| 026 | 2019 | [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](026-zero.md) | 分布式训练 |
| 027 | 2019 | [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](027-t5.md) | 预训练 |
| 028 | 2019 | [BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension](028-bart.md) | 预训练 |
| 029 | 2020 | [Scaling Laws for Neural Language Models](029-scaling-laws.md) | 规模定律 |
| 030 | 2020 | [REALM: Retrieval-Augmented Language Model Pre-Training](030-realm.md) | 检索增强 |
| 031 | 2020 | [ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators](031-electra.md) | 预训练 |
| 032 | 2020 | [Dense Passage Retrieval for Open-Domain Question Answering](032-dpr.md) | 检索增强 |
| 033 | 2020 | [Longformer: The Long-Document Transformer](033-longformer.md) | 长上下文 |
| 034 | 2020 | [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](034-rag.md) | 检索增强 |
| 035 | 2020 | [Language Models are Few-Shot Learners](035-gpt3.md) | 上下文学习 |
| 036 | 2020 | [Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering](036-fid.md) | 检索增强 |
| 037 | 2020 | [GShard: Scaling Giant Models with Conditional Computation and Automatic Sharding](037-gshard.md) | 稀疏架构 |
| 038 | 2020 | [Big Bird: Transformers for Longer Sequences](038-bigbird.md) | 长上下文 |
| 039 | 2020 | [Measuring Massive Multitask Language Understanding](039-mmlu.md) | 评估 |
| 040 | 2020 | [Rethinking Attention with Performers](040-performer.md) | 高效注意力 |
| 041 | 2020 | [The Pile: An 800GB Dataset of Diverse Text for Language Modeling](041-pile.md) | 数据 |
| 042 | 2021 | [Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity](042-switch.md) | 稀疏架构 |
| 043 | 2021 | [Learning Transferable Visual Models From Natural Language Supervision](043-clip.md) | 多模态 |
| 044 | 2021 | [Prefix-Tuning: Optimizing Continuous Prompts for Generation](044-prefix-tuning.md) | 参数高效微调 |
| 045 | 2021 | [The Power of Scale for Parameter-Efficient Prompt Tuning](045-prompt-tuning.md) | 参数高效微调 |
| 046 | 2021 | [RoFormer: Enhanced Transformer with Rotary Position Embedding](046-rope.md) | 位置表示 |
| 047 | 2021 | [LoRA: Low-Rank Adaptation of Large Language Models](047-lora.md) | 参数高效微调 |
| 048 | 2021 | [Evaluating Large Language Models Trained on Code](048-codex.md) | 代码与评估 |
| 049 | 2021 | [TruthfulQA: Measuring How Models Mimic Human Falsehoods](049-truthfulqa.md) | 评估 |
| 050 | 2021 | [Finetuned Language Models Are Zero-Shot Learners](050-flan.md) | 指令学习 |
| 051 | 2021 | [Multitask Prompted Training Enables Zero-Shot Task Generalization](051-t0.md) | 指令学习 |
| 052 | 2021 | [Training Verifiers to Solve Math Word Problems](052-gsm8k.md) | 推理与验证 |
| 053 | 2022 | [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](053-cot.md) | 推理 |
| 054 | 2022 | [Training Language Models to Follow Instructions with Human Feedback](054-instructgpt.md) | 对齐 |
| 055 | 2022 | [STaR: Bootstrapping Reasoning With Reasoning](055-star.md) | 推理 |
| 056 | 2022 | [Self-Consistency Improves Chain of Thought Reasoning in Language Models](056-self-consistency.md) | 推理 |
| 057 | 2022 | [Training Compute-Optimal Large Language Models](057-chinchilla.md) | 规模定律 |
| 058 | 2022 | [Flamingo: a Visual Language Model for Few-Shot Learning](058-flamingo.md) | 多模态 |
| 059 | 2022 | [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](059-flashattention.md) | 推理训练效率 |
| 060 | 2022 | [ReAct: Synergizing Reasoning and Acting in Language Models](060-react.md) | Agent |
| 061 | 2022 | [GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](061-gptq.md) | 量化 |
| 062 | 2022 | [Holistic Evaluation of Language Models](062-helm.md) | 评估 |
| 063 | 2022 | [PAL: Program-aided Language Models](063-pal.md) | 工具推理 |
| 064 | 2022 | [Fast Inference from Transformers via Speculative Decoding](064-speculative.md) | 推理效率 |
| 065 | 2022 | [Constitutional AI: Harmlessness from AI Feedback](065-constitutional.md) | 对齐 |
| 066 | 2023 | [BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models](066-blip2.md) | 多模态 |
| 067 | 2023 | [Toolformer: Language Models Can Teach Themselves to Use Tools](067-toolformer.md) | Agent |
| 068 | 2023 | [LLaMA: Open and Efficient Foundation Language Models](068-llama.md) | 预训练 |
| 069 | 2023 | [GPT-4 Technical Report](069-gpt4.md) | 多模态与评估 |
| 070 | 2023 | [Reflexion: Language Agents with Verbal Reinforcement Learning](070-reflexion.md) | Agent |
| 071 | 2023 | [Visual Instruction Tuning](071-llava.md) | 多模态 |
| 072 | 2023 | [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](072-tree-of-thoughts.md) | 搜索推理 |
| 073 | 2023 | [GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](073-gqa.md) | 推理效率 |
| 074 | 2023 | [QLoRA: Efficient Finetuning of Quantized LLMs](074-qlora.md) | 参数高效微调 |
| 075 | 2023 | [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](075-dpo.md) | 对齐 |
| 076 | 2023 | [AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration](076-awq.md) | 量化 |
| 077 | 2023 | [Lost in the Middle: How Language Models Use Long Contexts](077-lost-middle.md) | 长上下文评估 |
| 078 | 2023 | [Llama 2: Open Foundation and Fine-Tuned Chat Models](078-llama2.md) | 预训练与对齐 |
| 079 | 2023 | [Efficient Memory Management for Large Language Model Serving with PagedAttention](079-vllm.md) | 推理系统 |
| 080 | 2023 | [RLAIF: Scaling Reinforcement Learning from Human Feedback with AI Feedback](080-rlaif.md) | 对齐 |
| 081 | 2023 | [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](081-swebench.md) | Agent评估 |
| 082 | 2023 | [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](082-self-rag.md) | 检索增强 |
| 083 | 2023 | [Mamba: Linear-Time Sequence Modeling with Selective State Spaces](083-mamba.md) | 序列架构 |
| 084 | 2024 | [Mixtral of Experts](084-mixtral.md) | 稀疏架构 |
| 085 | 2024 | [Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads](085-medusa.md) | 推理效率 |
| 086 | 2024 | [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](086-deepseekmath.md) | 推理与RL |
| 087 | 2024 | [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](087-sweagent.md) | Agent |
| 088 | 2024 | [Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality](088-mamba2.md) | 序列架构 |
| 089 | 2024 | [Scaling and Evaluating Sparse Autoencoders](089-sae.md) | 可解释性 |
| 090 | 2024 | [From Local to Global: A Graph RAG Approach to Query-Focused Summarization](090-graphrag.md) | 检索增强 |
| 091 | 2024 | [Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters](091-test-time-scaling.md) | 推理预算 |
| 092 | 2024 | [DeepSeek-V3 Technical Report](092-deepseekv3.md) | 架构与训练 |
| 093 | 2024 | [2 OLMo 2 Furious](093-olmo2.md) | 开放训练配方 |
| 094 | 2025 | [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](094-r1.md) | 推理与RL |
| 095 | 2025 | [s1: Simple Test-Time Scaling](095-s1.md) | 推理预算 |
| 096 | 2025 | [Large Language Diffusion Models](096-llada.md) | 扩散语言模型 |
| 097 | 2025 | [DAPO: An Open-Source LLM Reinforcement Learning System at Scale](097-dapo.md) | 推理与RL |
| 098 | 2026 | [Inference-Time Scaling of Verification: Self-Evolving Deep Research Agents via Test-Time Rubric-Guided Verification](098-rubric-verification.md) | 验证与Agent |
| 099 | 2026 | [LLMs Improving LLMs: Agentic Discovery for Test-Time Scaling](099-autotts.md) | 推理控制 |
| 100 | 2026 | [Test-Time Scaling in Reasoning LLMs: Inference Regimes, Evaluation, and Reproducibility](100-tts-protocol.md) | 评估协议 |
