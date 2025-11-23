import { createOpenAI } from '@ai-sdk/openai';

const openrouterInstance = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
});

// Export model function
export function openrouter(modelName: string) {
  return openrouterInstance(modelName);
}

// Export common models
export const models = {
  NVIDIA: openrouter('microsoft/phi-3-medium-128k-instruct'),
};