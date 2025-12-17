import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config } from '../config';

/**
 * Generate a list of project requirements (tools/materials) using Gemini.
 */
export async function generateProjectRequirements(projectTitle: string): Promise<string[]> {
  const title = projectTitle?.trim();
  if (!title) return [];

  const apiKey = Config.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini API key missing; cannot generate requirements');
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `I am planning a project called '${title}'. Provide a strictly formatted JSON array of strings listing the essential tools and materials required. Do not include introductory text.`;

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
