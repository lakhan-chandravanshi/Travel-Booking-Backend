import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import * as gemini from './gemini.js';
import * as openai from './openai.js';
import * as mock from './mock.js';

const PROVIDERS = { gemini, openai, mock };

function resolveProvider() {
  const name = env.ai.provider;
  const provider = PROVIDERS[name];
  if (!provider) {
    logger.warn(`Unknown AI_PROVIDER "${name}", using mock.`);
    return { name: 'mock', provider: mock };
  }
  // Guard against "configured for gemini/openai but no key" — degrade to mock
  // so the app stays functional instead of throwing on every upload.
  if (name === 'gemini' && !env.ai.gemini.apiKey) {
    logger.warn('AI_PROVIDER=gemini but GEMINI_API_KEY is empty — using mock provider.');
    return { name: 'mock', provider: mock };
  }
  if (name === 'openai' && !env.ai.openai.apiKey) {
    logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY is empty — using mock provider.');
    return { name: 'mock', provider: mock };
  }
  return { name, provider };
}

const active = resolveProvider();
logger.info(`AI provider: ${active.name}`);

export const aiProviderName = active.name;

/** Extract structured booking data from a document. */
export function extractBookingData(input) {
  return active.provider.extractBookingData(input);
}

/** Generate a structured itinerary from an array of normalised bookings. */
export function generateItinerary(bookings) {
  return active.provider.generateItinerary(bookings);
}

export default { extractBookingData, generateItinerary, aiProviderName };
