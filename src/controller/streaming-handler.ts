import { Response } from 'express';
import { InferenceRequest } from '../types';

export interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class StreamingHandler {
  sendSSEHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

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

  createChunk(
    id: string,
    model: string,
    content: string,
    finishReason: string | null = null,
    isFirst = false
  ): StreamChunk {
    return {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: isFirst
            ? { role: 'assistant', content }
            : { content },
          finish_reason: finishReason,
        },
      ],
    };
  }

  async streamFromWorker(
    res: Response,
    request: InferenceRequest,
    workerUrl: string
  ): Promise<void> {
    const axios = require('axios');
    
    try {
      // Forward streaming request to worker
      const response = await axios.post(
        `${workerUrl}/inference/stream`,
        request,
        {
          responseType: 'stream',
          timeout: 120000,
        }
      );

      // Pipe worker stream to client
      response.data.on('data', (chunk: Buffer) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        this.sendDone(res);
      });

      response.data.on('error', (error: Error) => {
        this.sendError(res, error.message);
      });
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }

  // Simulate streaming for demo/testing
  async simulateStreaming(
    res: Response,
    text: string,
    requestId: string,
    model: string
  ): Promise<void> {
    const words = text.split(' ');
    
    // Send first chunk with role
    this.sendChunk(
      res,
      this.createChunk(requestId, model, words[0] + ' ', null, true)
    );

    // Stream word by word
    for (let i = 1; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
      
      const content = words[i] + (i < words.length - 1 ? ' ' : '');
      this.sendChunk(
        res,
        this.createChunk(requestId, model, content)
      );
    }

    // Send final chunk
    this.sendChunk(
      res,
      this.createChunk(requestId, model, '', 'stop')
    );

    this.sendDone(res);
  }
}
