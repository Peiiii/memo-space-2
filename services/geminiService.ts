import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes an image to generate a poetic, abstract memory description.
 */
export const interpretMemory = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Observe this image. Describe it as a fleeting, abstract, and nostalgic memory. Write a single, very short, poetic sentence in Chinese (maximum 20 words). Do not describe the literal objects, but the feeling of the memory.",
          },
        ],
      },
    });

    return response.text || "一段模糊的记忆...";
  } catch (error) {
    console.error("Failed to interpret memory:", error);
    return "无法触及的记忆片段...";
  }
};

/**
 * Expands on an existing memory description based on a user's prompt (callback).
 */
export const expandMemory = async (
  base64Data: string, 
  mimeType: string, 
  currentDescription: string, 
  userPrompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Context: A poetic memory description: "${currentDescription}".
                   User interaction: "${userPrompt}".
                   Task: Write a short, poetic continuation or response in Chinese (max 1 sentence) that flows naturally from the current description, inspired by the user's thought. Keep the tone nostalgic and ethereal.`,
          },
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Failed to expand memory:", error);
    return "";
  }
};