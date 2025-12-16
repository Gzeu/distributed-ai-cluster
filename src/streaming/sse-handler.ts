import { Response } from 'express';
import { logger } from '../utils/logger';

export interface StreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finishReason?: string | null;
  }>;
  created: number;
}

export class SSEHandler {
  private res: Response;
  private requestId: string;
  private isConnected: boolean = true;

  constructor(res: Response, requestId: string) {
    this.res = res;
    this.requestId = requestId;
    this.setupSSE();
  }

  private setupSSE() {
    // Set SSE headers
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Handle client disconnect
    this.res.on('close', () => {
      this.isConnected = false;
      logger.debug('SSE connection closed', { requestId: this.requestId });
    });

    this.res.flushHeaders();
  }

  /**
   * Send a chunk of data to the client
   */
  sendChunk(chunk: StreamChunk) {
    if (!this.isConnected) {
      return;
    }

    const data = JSON.stringify(chunk);
    this.res.write(`data: ${data}\n\n`);
  }

  /**
   * Send content token
   */
  sendContent(content: string, model: string = 'default') {
    if (!this.isConnected) {
      return;
    }

    const chunk: StreamChunk = {
      id: this.requestId,
      model,
      choices: [
        {
          index: 0,
          delta: {
            content,
          },
          finishReason: null,
        },
      ],
      created: Date.now(),
    };

    this.sendChunk(chunk);
  }

  /**
   * Send role (system, user, assistant)
   */
  sendRole(role: string, model: string = 'default') {
    if (!this.isConnected) {
      return;
    }

    const chunk: StreamChunk = {
      id: this.requestId,
      model,
      choices: [
        {
          index: 0,
          delta: {
            role,
          },
          finishReason: null,
        },
      ],
      created: Date.now(),
    };

    this.sendChunk(chunk);
  }

  /**
   * Send final chunk with finish reason
   */
  sendFinal(finishReason: string = 'stop', model: string = 'default') {
    if (!this.isConnected) {
      return;
    }

    const chunk: StreamChunk = {
      id: this.requestId,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finishReason,
        },
      ],
      created: Date.now(),
    };

    this.sendChunk(chunk);
    this.sendDone();
  }

  /**
   * Send [DONE] message to signal stream end
   */
  sendDone() {
    if (!this.isConnected) {
      return;
    }

    this.res.write('data: [DONE]\n\n');
    this.res.end();
    this.isConnected = false;
  }

  /**
   * Send error and close stream
   */
  sendError(error: string) {
    if (!this.isConnected) {
      return;
    }

    const errorChunk = {
      error: {
        message: error,
        type: 'internal_error',
        code: 500,
      },
    };

    this.res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
    this.res.end();
    this.isConnected = false;
  }

  /**
   * Check if connection is still alive
   */
  isAlive(): boolean {
    return this.isConnected;
  }
}
