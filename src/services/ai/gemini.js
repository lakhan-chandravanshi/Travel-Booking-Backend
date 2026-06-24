import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { extractionPrompt, itineraryPrompt } from './prompts.js';
import { parseJson } from './parseJson.js';

let client = null;
function getModel() {
  if (!env.ai.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Set AI_PROVIDER=mock to demo without a key.');
  }
  if (!client) client = new GoogleGenerativeAI(env.ai.gemini.apiKey);
  return client.getGenerativeModel({
    model: env.ai.gemini.model,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  });
}

/**
 * Gemini is natively multimodal: we pass the document bytes (PDF or image)
 * directly alongside the text prompt so it can "see" tickets/screenshots.
 */
export async function extractBookingData({ rawText, buffer, mimeType }) {
  const model = getModel();
  const parts = [{ text: extractionPrompt(rawText) }];

  const canInline = mimeType === 'application/pdf' || mimeType?.startsWith('image/');
  if (canInline && buffer) {
    parts.push({ inlineData: { data: buffer.toString('base64'), mimeType } });
  }

  const result = await model.generateContent(parts);
  return parseJson(result.response.text());
}

export async function generateItinerary(bookings) {
  const model = getModel();
  const result = await model.generateContent(itineraryPrompt(bookings));
  return parseJson(result.response.text());
}

export default { extractBookingData, generateItinerary };
