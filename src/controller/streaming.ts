import { Response } from 'express';
import { InferenceRequest } from '../types';

export class StreamingManager {
  sendSSEMessage(res: Response, event: string, data: any): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  async handleStreamingRequest(
    res: Response,
    request: InferenceRequest,
    processToken: (token: string) => Promise<void>
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial message
    this.sendSSEMessage(res, 'start', {
      id: request.id,
      model: request.model,
    });

    try {
      // This will be called by the worker for each token
      await processToken('');
    } catch (error: any) {
      this.sendSSEMessage(res, 'error', {
        error: error.message,
      });
    } finally {
      this.sendSSEMessage(res, 'done', {
        id: request.id,
      });
      res.end();
    }
  }

  formatStreamChunk(
    id: string,
    model: string,
    content: string,
    finishReason: string | null = null
  ): string {
    const chunk = {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: content ? { content } : {},
          finish_reason: finishReason,
        },
      ],
    };

    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  sendStreamChunk(res: Response, chunk: string): void {
    res.write(chunk);
  }

  endStream(res: Response): void {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
