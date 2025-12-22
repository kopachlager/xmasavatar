
import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export async function transformToChristmasAvatar(
  base64Image: string,
  themePrompt: string
): Promise<string> {
  const ai = getAIClient();
  
  // Clean up the base64 string if it contains the prefix
  const data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: 'image/png',
          },
        },
        {
          text: `Please edit this profile photo into a festive Christmas version. 
          Follow these specific instructions: ${themePrompt}. 
          Maintain the recognizable features of the person's face but integrate the festive elements naturally. 
          The output should be a square avatar-style image.`,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from the artisan");
}

/**
 * Utility to fetch and convert an image URL to base64.
 * Uses a proxy to avoid CORS issues where possible.
 */
export async function urlToBase64(url: string): Promise<string> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error("Failed to fetch image from URL");
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
