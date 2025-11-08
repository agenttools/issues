import { input, password } from '@inquirer/prompts';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.issue-manager');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  anthropicApiKey?: string;
  linearApiKey?: string;
}

/**
 * Load configuration from disk
 */
function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read config file:', error);
    return {};
  }
}

/**
 * Save configuration to disk
 */
function saveConfig(config: Config): void {
  try {
    // Create config directory if it doesn't exist
    if (!existsSync(CONFIG_DIR)) {
      const fs = require('fs');
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config file:', error);
  }
}

/**
 * Get Anthropic API key from environment, config, or prompt user
 */
export async function getAnthropicApiKey(): Promise<string> {
  // First, check environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Second, check config file
  const config = loadConfig();
  if (config.anthropicApiKey) {
    return config.anthropicApiKey;
  }

  // Third, prompt user
  console.log('\n🔑 Anthropic API Key Required\n');
  console.log('You can get your API key from: https://console.anthropic.com/\n');

  const apiKey = await password({
    message: 'Enter your Anthropic API key:',
    mask: '*',
  });

  if (!apiKey) {
    throw new Error('API key is required to use this tool');
  }

  // Ask if they want to save it
  const shouldSave = await input({
    message: 'Save this key for future use? (y/N):',
    default: 'n',
  });

  if (shouldSave.toLowerCase() === 'y' || shouldSave.toLowerCase() === 'yes') {
    saveConfig({ ...config, anthropicApiKey: apiKey });
    console.log(`\n✓ API key saved to ${CONFIG_FILE}\n`);
  }

  return apiKey;
}

/**
 * Get Linear API key from environment, config, or prompt user
 */
export async function getLinearApiKey(): Promise<string> {
  // First, check environment variable
  if (process.env.LINEAR_API_KEY) {
    return process.env.LINEAR_API_KEY;
  }

  // Second, check config file
  const config = loadConfig();
  if (config.linearApiKey) {
    return config.linearApiKey;
  }

  // Third, prompt user
  console.log('\n🔑 Linear API Key Required\n');
  console.log('You can get your API key from: https://linear.app/settings/api\n');

  const apiKey = await password({
    message: 'Enter your Linear API key:',
    mask: '*',
  });

  if (!apiKey) {
    throw new Error('API key is required to use this tool');
  }

  // Ask if they want to save it
  const shouldSave = await input({
    message: 'Save this key for future use? (y/N):',
    default: 'n',
  });

  if (shouldSave.toLowerCase() === 'y' || shouldSave.toLowerCase() === 'yes') {
    saveConfig({ ...config, linearApiKey: apiKey });
    console.log(`\n✓ API key saved to ${CONFIG_FILE}\n`);
  }

  return apiKey;
}

/**
 * Clear saved API keys
 */
export function clearApiKeys(): void {
  const config = loadConfig();
  delete config.anthropicApiKey;
  delete config.linearApiKey;
  saveConfig(config);
  console.log('✓ API keys cleared');
}
