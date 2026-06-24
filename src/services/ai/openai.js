import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { extractionPrompt, itineraryPrompt } from './prompts.js';
import { parseJson } from './parseJson.js';

let client = null;
function getClient() {
  if (!env.ai.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Set AI_PROVIDER=mock to demo without a key.');
  }
  if (!client) client = new OpenAI({ apiKey: env.ai.openai.apiKey });
  return client;
}

export async function extractBookingData({ rawText, buffer, mimeType }) {
  const openai = getClient();

  // GPT-4o vision accepts images as data URLs. PDFs are handled via the text
  // we already extracted with pdf-parse.
  const content = [{ type: 'text', text: extractionPrompt(rawText) }];
  if (mimeType?.startsWith('image/') && buffer) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` },
    });
  }

  const completion = await openai.chat.completions.create({
    model: env.ai.openai.model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content }],
  });
  return parseJson(completion.choices[0]?.message?.content);
}

export async function generateItinerary(bookings) {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: env.ai.openai.model,
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: itineraryPrompt(bookings) }],
  });
  return parseJson(completion.choices[0]?.message?.content);
}

export default { extractBookingData, generateItinerary };
