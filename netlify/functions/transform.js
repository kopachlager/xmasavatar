
import { GoogleGenAI } from "@google/genai";

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  try {
    const { image, prompt } = JSON.parse(event.body);
    
    if (!image || !prompt) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Missing image or prompt in request body" }) 
      };
    }

    // Initialize the Gemini AI client with the server-side API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Clean the base64 data (remove header if present)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          {
            text: `Please edit this profile photo into a festive Christmas version. 
            Follow these specific instructions: ${prompt}. 
            Maintain the recognizable features of the person's face but integrate the festive elements naturally. 
            The output should be a square avatar-style image.`,
          },
        ],
      },
    });

    // Find the image part in the response
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    
    if (!part) {
       return { 
         statusCode: 500, 
         body: JSON.stringify({ error: "The artisan failed to return an image artifact." }) 
       };
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Adjust as needed for security
      },
      body: JSON.stringify({ 
        image: `data:image/png;base64,${part.inlineData.data}` 
      }),
    };
  } catch (error) {
    console.error("Serverless Function Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Alchemy failed: " + error.message }) 
    };
  }
};
