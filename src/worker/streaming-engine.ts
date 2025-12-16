import { LlamaEngine } from './llama-engine';
import { InferenceRequest } from '../types';

export interface StreamingCallback {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class StreamingEngine {
  private llamaEngine: LlamaEngine | null = null;

  constructor(llamaEngine: LlamaEngine | null) {
    this.llamaEngine = llamaEngine;
  }

  async processStreamingInference(
    request: InferenceRequest,
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!this.llamaEngine) {
      // Demo mode streaming
      await this.demoStreaming(request, callbacks);
      return;
    }

    try {
      const prompt = this.formatMessages(request.messages);
      let fullText = '';
      let tokenBuffer = '';

      // Use llama.cpp streaming
      const session = await this.llamaEngine.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      await session.prompt(prompt, {
        maxTokens: request.maxTokens || 500,
        temperature: request.temperature || 0.7,
        topP: request.topP || 0.95,
        onToken: (tokens: number[]) => {
          // Convert token IDs to text
          const text = this.tokensToText(tokens);
          tokenBuffer += text;

          // Send when we have a word boundary
          if (tokenBuffer.includes(' ') || tokenBuffer.includes('\n')) {
            callbacks.onToken(tokenBuffer);
            fullText += tokenBuffer;
            tokenBuffer = '';
          }
        },
      });

      // Send any remaining tokens
      if (tokenBuffer) {
        callbacks.onToken(tokenBuffer);
        fullText += tokenBuffer;
      }

      callbacks.onComplete(fullText);
    } catch (error: any) {
      callbacks.onError(error);
    }
  }

  private async demoStreaming(
    request: InferenceRequest,
    callbacks: StreamingCallback
  ): Promise<void> {
    const fullResponse = `This is a demo streaming response. In production, this would be generated token by token from the actual LLM model. The request was: "${request.messages[request.messages.length - 1]?.content}". Each word appears gradually to simulate real-time generation.`;

    const words = fullResponse.split(' ');
    let fullText = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      fullText += word;
      callbacks.onToken(word);

      // Simulate token generation delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    callbacks.onComplete(fullText);
  }

  private formatMessages(messages: Array<{ role: string; content: string }>): string {
    let prompt = '';
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `### System:\n${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `### User:\n${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `### Assistant:\n${message.content}\n\n`;
      }
    }
    prompt += '### Assistant:\n';
    return prompt;
  }

  private tokensToText(tokens: number[]): string {
    // This would use the model's tokenizer
    // For now, placeholder implementation
    return tokens.map(t => String.fromCharCode(t)).join('');
  }
}
