import { SSEHandler } from './sse-handler';
import { InferenceRequest } from '../types';
import { logger } from '../utils/logger';

export class StreamProcessor {
  /**
   * Process streaming inference with token-by-token generation
   */
  static async processStream(
    sseHandler: SSEHandler,
    request: InferenceRequest,
    generatorFn: (onToken: (token: string) => void) => Promise<string>
  ): Promise<void> {
    try {
      // Send initial role
      sseHandler.sendRole('assistant', request.model);

      // Process generation with token callback
      let fullText = '';
      
      await generatorFn((token: string) => {
        if (!sseHandler.isAlive()) {
          logger.debug('Stream aborted by client', { requestId: request.id });
          return;
        }

        fullText += token;
        sseHandler.sendContent(token, request.model);
      });

      // Send final chunk
      if (sseHandler.isAlive()) {
        sseHandler.sendFinal('stop', request.model);
        logger.info('Stream completed', {
          requestId: request.id,
          length: fullText.length,
        });
      }
    } catch (error: any) {
      logger.error('Stream processing error', {
        requestId: request.id,
        error: error.message,
      });
      
      if (sseHandler.isAlive()) {
        sseHandler.sendError(error.message);
      }
    }
  }

  /**
   * Simulate streaming for demo mode (character by character)
   */
  static async simulateStream(
    sseHandler: SSEHandler,
    text: string,
    model: string = 'default',
    delayMs: number = 20
  ): Promise<void> {
    // Send role
    sseHandler.sendRole('assistant', model);

    // Stream character by character
    for (let i = 0; i < text.length; i++) {
      if (!sseHandler.isAlive()) {
        logger.debug('Simulated stream aborted');
        return;
      }

      sseHandler.sendContent(text[i], model);
      
      // Add delay to simulate real generation
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Send final chunk
    if (sseHandler.isAlive()) {
      sseHandler.sendFinal('stop', model);
    }
  }

  /**
   * Stream word by word (more realistic than character by character)
   */
  static async streamWordByWord(
    sseHandler: SSEHandler,
    text: string,
    model: string = 'default',
    delayMs: number = 50
  ): Promise<void> {
    sseHandler.sendRole('assistant', model);

    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (!sseHandler.isAlive()) {
        return;
      }

      const word = i === words.length - 1 ? words[i] : words[i] + ' ';
      sseHandler.sendContent(word, model);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    if (sseHandler.isAlive()) {
      sseHandler.sendFinal('stop', model);
    }
  }
}
