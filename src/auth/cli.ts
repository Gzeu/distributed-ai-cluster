#!/usr/bin/env node
/**
 * CLI tool for managing API keys
 * Usage: tsx src/auth/cli.ts <command> [options]
 */

import { apiKeyManager } from './api-key-manager';
import { logger } from '../utils/logger';
import { config } from 'dotenv';

config();

const commands = {
  create: async (args: string[]) => {
    const name = args[0] || 'default';
    const userId = args[1] || 'default';
    
    const apiKey = await apiKeyManager.createApiKey(name, userId, {
      requestsPerMinute: 60,
      requestsPerDay: 10000,
    });

    console.log('\n✅ API Key Created Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name:                ${apiKey.name}`);
    console.log(`User ID:             ${apiKey.userId}`);
    console.log(`API Key:             ${apiKey.key}`);
    console.log(`Rate Limit:          ${apiKey.rateLimit.requestsPerMinute} req/min`);
    console.log(`Daily Limit:         ${apiKey.rateLimit.requestsPerDay} req/day`);
    console.log(`Expires:             ${apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString() : 'Never'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  Save this key securely - it cannot be retrieved later!\n');
    console.log('Usage examples:\n');
    console.log(`  curl -H "X-API-Key: ${apiKey.key}" http://localhost:8080/v1/chat/completions`);
    console.log(`  curl -H "Authorization: Bearer ${apiKey.key}" http://localhost:8080/v1/chat/completions\n`);

    process.exit(0);
  },

  validate: async (args: string[]) => {
    const key = args[0];
    if (!key) {
      console.error('❌ Error: API key required');
      console.log('Usage: npm run api-key validate <api-key>');
      process.exit(1);
    }

    const apiKey = await apiKeyManager.validateApiKey(key);
    
    if (!apiKey) {
      console.log('\n❌ Invalid or expired API key\n');
      process.exit(1);
    }

    console.log('\n✅ Valid API Key\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name:                ${apiKey.name}`);
    console.log(`User ID:             ${apiKey.userId}`);
    console.log(`Created:             ${new Date(apiKey.createdAt).toISOString()}`);
    console.log(`Rate Limit:          ${apiKey.rateLimit.requestsPerMinute} req/min`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  },

  usage: async (args: string[]) => {
    const key = args[0];
    if (!key) {
      console.error('❌ Error: API key required');
      console.log('Usage: npm run api-key usage <api-key>');
      process.exit(1);
    }

    const usage = await apiKeyManager.getUsageStats(key);
    
    if (!usage) {
      console.log('\n⚠️  No usage data found\n');
      process.exit(0);
    }

    console.log('\n📊 API Key Usage Statistics\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Requests:      ${usage.requestCount}`);
    console.log(`Total Tokens:        ${usage.totalTokens}`);
    console.log(`Last Used:           ${usage.lastUsed ? new Date(usage.lastUsed).toISOString() : 'Never'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  },

  revoke: async (args: string[]) => {
    const key = args[0];
    if (!key) {
      console.error('❌ Error: API key required');
      console.log('Usage: npm run api-key revoke <api-key>');
      process.exit(1);
    }

    await apiKeyManager.revokeApiKey(key);
    console.log('\n✅ API key revoked successfully\n');
    process.exit(0);
  },

  help: async () => {
    console.log('\n🔐 API Key Management CLI\n');
    console.log('Commands:');
    console.log('  create [name] [userId]  - Create a new API key');
    console.log('  validate <key>          - Validate an API key');
    console.log('  usage <key>             - View usage statistics');
    console.log('  revoke <key>            - Revoke an API key');
    console.log('  help                    - Show this help message\n');
    console.log('Examples:');
    console.log('  tsx src/auth/cli.ts create "My App" user123');
    console.log('  tsx src/auth/cli.ts validate sk-ai-abc123...');
    console.log('  tsx src/auth/cli.ts usage sk-ai-abc123...');
    console.log('  tsx src/auth/cli.ts revoke sk-ai-abc123...\n');
    process.exit(0);
  },
};

// Parse command
const [,, command, ...args] = process.argv;

if (!command || !commands[command as keyof typeof commands]) {
  commands.help();
} else {
  commands[command as keyof typeof commands](args).catch((error) => {
    logger.error('CLI command failed', { error: error.message });
    console.error('\n❌ Error:', error.message, '\n');
    process.exit(1);
  });
}
