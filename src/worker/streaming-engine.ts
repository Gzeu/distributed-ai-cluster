import { LlamaEngine } from './llama-engine';
import { InferenceRequest } from '../types';

export class StreamingEngine {
  constructor(private llamaEngine: LlamaEngine | null) {}

  async *generateStream(request: InferenceRequest): AsyncGenerator<string, void, unknown> {
    if (!this.llamaEngine || !this.llamaEngine.isModelLoaded()) {
      // Demo mode streaming
      yield* this.demoStream(request);
      return;
    }

    // Real streaming with llama.cpp
    yield* this.realStream(request);
  }

  private async *demoStream(request: InferenceRequest): AsyncGenerator<string, void, unknown> {
    const words = [
      'This',
      'is',
      'a',
      'demo',
      'streaming',
      'response',
      'from',
      'the',
      'AI',
      'cluster.',
      'In',
      'production,',
      'tokens',
      'would',
      'be',
      'streamed',
      'directly',
      'from',
      'the',
      'LLM',
      'model.',
    ];

    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      yield word + ' ';
    }
  }

  private async *realStream(request: InferenceRequest): AsyncGenerator<string, void, unknown> {
    // This will be implemented when llama-engine supports streaming
    // For now, use demo mode
    yield* this.demoStream(request);

    // TODO: Real implementation with llama.cpp streaming:
    // const prompt = this.formatMessages(request.messages);
    // const stream = await this.llamaEngine.streamPrompt(prompt, {
    //   maxTokens: request.maxTokens,
    //   temperature: request.temperature,
    //   onToken: (token) => yield token
    // });
  }
}
