import { Request, Response } from 'express';
import { InferenceRequest } from '../types';
import logger from '../utils/logger';

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finishReason: string | null;
  }>;
}

export class StreamingManager {
  sendChunk(res: Response, chunk: StreamChunk): void {
    const data = JSON.stringify(chunk);
    res.write(`data: ${data}\n\n`);
  }

  sendDone(res: Response): void {
    res.write('data: [DONE]\n\n');
    res.end();
  }

  sendError(res: Response, error: string): void {
    const errorChunk = {
      error: {
        message: error,
        type: 'server_error',
      },
    };
    res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
    res.end();
  }

  setupSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
  }

  async streamInference(
    res: Response,
    request: InferenceRequest,
    processChunk: (onChunk: (text: string) => void) => Promise<void>
  ): Promise<void> {
    this.setupSSE(res);

    const startTime = Date.now();
    let tokenCount = 0;

    try {
      // Send initial chunk with role
      this.sendChunk(res, {
        id: request.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            delta: { role: 'assistant' },
            finishReason: null,
          },
        ],
      });

      // Stream tokens
      await processChunk((text: string) => {
        tokenCount++;
        this.sendChunk(res, {
          id: request.id,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [
            {
              index: 0,
              delta: { content: text },
              finishReason: null,
            },
          ],
        });
      });

      // Send final chunk
      this.sendChunk(res, {
        id: request.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {},
            finishReason: 'stop',
          },
        ],
      });

      this.sendDone(res);

      const duration = Date.now() - startTime;
      logger.info('Streaming completed', {
        requestId: request.id,
        tokens: tokenCount,
        duration: `${duration}ms`,
        tokensPerSecond: ((tokenCount / duration) * 1000).toFixed(2),
      });
    } catch (error: any) {
      logger.error('Streaming error', { error: error.message, requestId: request.id });
      this.sendError(res, error.message);
    }
  }
}
