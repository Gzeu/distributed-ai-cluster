import { LlamaModel, LlamaContext, LlamaChatSession, LlamaModelOptions } from 'node-llama-cpp';
import { InferenceRequest, InferenceResult } from '../types';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface LlamaEngineConfig {
  modelPath: string;
  contextSize?: number;
  gpuLayers?: number;
  batchSize?: number;
  threads?: number;
}

export class LlamaEngine {
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private config: LlamaEngineConfig;
  private isLoaded = false;
  private activeRequests = 0;
  private totalRequests = 0;
  private totalResponseTime = 0;
  private totalTokens = 0;

  constructor(config: LlamaEngineConfig) {
    this.config = {
      contextSize: 2048,
      gpuLayers: 0,
      batchSize: 512,
      threads: Math.max(1, os.cpus().length - 1),
      ...config,
    };
  }

  async loadModel(): Promise<void> {
    if (this.isLoaded) {
      console.log('⚠️  Model already loaded');
      return;
    }

    if (!fs.existsSync(this.config.modelPath)) {
      throw new Error(`Model file not found: ${this.config.modelPath}`);
    }

    console.log('📦 Loading model...');
    console.log(`   Path: ${this.config.modelPath}`);
    console.log(`   Context: ${this.config.contextSize}`);
    console.log(`   GPU Layers: ${this.config.gpuLayers}`);
    console.log(`   Threads: ${this.config.threads}`);

    const startTime = Date.now();

    try {
      const modelOptions: LlamaModelOptions = {
        modelPath: this.config.modelPath,
        gpuLayers: this.config.gpuLayers,
      };

      this.model = await LlamaModel.load(modelOptions);
      this.context = await this.model.createContext({
        contextSize: this.config.contextSize,
        batchSize: this.config.batchSize,
        threads: this.config.threads,
      });
      this.session = new LlamaChatSession({ context: this.context });

      this.isLoaded = true;
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Model loaded successfully in ${loadTime}s`);

      const stats = await this.getModelInfo();
      console.log(`   Model size: ${stats.modelSize}`);
      console.log(`   Architecture: ${stats.architecture}`);
    } catch (error: any) {
      console.error('❌ Failed to load model:', error.message);
      throw error;
    }
  }

  async processInference(request: InferenceRequest): Promise<InferenceResult> {
    if (!this.isLoaded || !this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    this.activeRequests++;
    this.totalRequests++;

    const startTime = Date.now();

    try {
      const prompt = this.formatMessages(request.messages);
      
      console.log(`🔄 Processing inference request ${request.id}`);
      console.log(`   Prompt length: ${prompt.length} chars`);

      const response = await this.session.prompt(prompt, {
        maxTokens: request.maxTokens || 500,
        temperature: request.temperature || 0.7,
        topP: request.topP || 0.95,
        repeatPenalty: {
          penalty: (request.frequencyPenalty || 0) + 1,
          presencePenalty: request.presencePenalty || 0,
        },
      });

      const responseTime = Date.now() - startTime;
      this.totalResponseTime += responseTime;

      const promptTokens = Math.floor(prompt.length / 4);
      const completionTokens = Math.floor(response.length / 4);
      this.totalTokens += completionTokens;

      console.log(`✅ Inference completed in ${responseTime}ms`);
      console.log(`   Tokens: ${promptTokens} prompt + ${completionTokens} completion`);

      return {
        text: response,
        promptTokens,
        completionTokens,
      };
    } catch (error: any) {
      console.error('❌ Inference error:', error.message);
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  // NEW: Streaming support
  async streamPrompt(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      onToken: (token: string) => void;
    }
  ): Promise<void> {
    if (!this.isLoaded || !this.session) {
      throw new Error('Model not loaded');
    }

    await this.session.prompt(prompt, {
      maxTokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
      topP: options.topP || 0.95,
      onToken: (tokens) => {
        // Call callback for each token
        options.onToken(tokens.join(''));
      },
    });
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

  async getModelInfo(): Promise<any> {
    if (!this.model) {
      return {
        modelSize: 'Unknown',
        architecture: 'Unknown',
        loaded: false,
      };
    }

    const stats = fs.statSync(this.config.modelPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);

    return {
      modelSize: parseFloat(sizeGB) > 1 ? `${sizeGB} GB` : `${sizeMB} MB`,
      architecture: path.basename(this.config.modelPath),
      loaded: this.isLoaded,
      contextSize: this.config.contextSize,
      gpuLayers: this.config.gpuLayers,
    };
  }

  getMetrics() {
    return {
      activeRequests: this.activeRequests,
      totalRequests: this.totalRequests,
      avgResponseTime: this.totalRequests > 0 ? this.totalResponseTime / this.totalRequests : 0,
      tokensPerSecond: this.totalResponseTime > 0 ? (this.totalTokens / (this.totalResponseTime / 1000)) : 0,
    };
  }

  async unload(): Promise<void> {
    if (this.session) this.session = null;
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
    if (this.model) {
      await this.model.dispose();
      this.model = null;
    }
    this.isLoaded = false;
    console.log('🗑️  Model unloaded');
  }

  isModelLoaded(): boolean {
    return this.isLoaded;
  }
}
