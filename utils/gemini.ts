import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config } from '../config';

/**
 * Generate a list of project requirements (tools/materials) using Gemini.
 */
export async function generateProjectRequirements(projectTitle: string, description?: string): Promise<string[]> {
  const title = projectTitle?.trim();
  if (!title) return [];

  const apiKey = Config.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini API key missing; cannot generate requirements');
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let promptContext = `I am planning a project called '${title}'.`;
    if (description?.trim()) {
      promptContext += ` Description: ${description.trim()}.`;
    }

    const prompt = `${promptContext} Provide a strictly formatted JSON array of strings listing the essential tools and materials required. Do not include introductory text.`;

    const result = await model.generateContent([{ text: prompt }]);
    const text = (await result.response).text();

    let jsonText = text;
    const fenced = text.match(/```json\n([\s\S]*?)\n```/);
    if (fenced) {
      jsonText = fenced[1];
    } else {
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('Failed to generate project requirements:', error);
    return [];
  }
}

/**
 * Generate a short description/purpose for an item using Gemini.
 */
export async function generateItemDescription(itemName: string): Promise<string> {
  const name = itemName?.trim();
  if (!name) return '';

  const apiKey = Config.GEMINI_API_KEY;
  if (!apiKey) return '';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Provide a concise, 1-sentence description of the purpose of "${name}". Start directly with the description, no intro.`;

    const result = await model.generateContent([{ text: prompt }]);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.warn('Error generating item description:', error);
    return '';
  }
}
