import { Response } from 'express';
import { LlamaEngine } from './llama-engine';
import { InferenceRequest } from '../types';

export class StreamingEngine {
  constructor(private llamaEngine: LlamaEngine) {}

  async streamInference(
    res: Response,
    request: InferenceRequest
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const requestId = request.id;
    const model = request.model;
    let isFirst = true;
    let tokenCount = 0;

    try {
      // Format prompt
      const prompt = this.formatMessages(request.messages);

      // Stream tokens from LlamaEngine
      await this.llamaEngine.streamPrompt(
        prompt,
        {
          maxTokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
          topP: request.topP || 0.95,
          onToken: (token: string) => {
            tokenCount++;
            
            const chunk = {
              id: requestId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [
                {
                  index: 0,
                  delta: isFirst
                    ? { role: 'assistant', content: token }
                    : { content: token },
                  finish_reason: null,
                },
              ],
            };

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            isFirst = false;
          },
        }
      );

      // Send final chunk
      const finalChunk = {
        id: requestId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      };

      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      console.log(`✅ Streaming completed: ${tokenCount} tokens`);
    } catch (error: any) {
      console.error('❌ Streaming error:', error.message);
      
      const errorChunk = {
        error: {
          message: error.message,
          type: 'server_error',
        },
      };
      
      res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      res.end();
    }
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
}
