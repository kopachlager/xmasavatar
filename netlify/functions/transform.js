import { GoogleGenAI } from "@google/genai";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("ENVIRONMENT ERROR: API_KEY is missing.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Configuration Error: API Key not found on server." })
      };
    }

    const { image, prompt } = JSON.parse(event.body);
    
    if (!image) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: "No image artifact detected." }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    console.log("Starting AI transformation with prompt:", prompt);

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
            text: `Please edit this profile photo into a festive Christmas version. Style: ${prompt}. Maintain original facial features and identity perfectly. Square output. High quality.`,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.find(p => p.inlineData);
    
    if (!part) {
       console.error("AI RESPONSE ERROR: No image data returned.", JSON.stringify(candidate));
       return { 
         statusCode: 500, 
         headers,
         body: JSON.stringify({ error: "The AI artisan failed to generate the festive artifact. Try a clearer portrait." }) 
       };
    }

    console.log("Transformation successful.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        image: `data:image/png;base64,${part.inlineData.data}` 
      }),
    };
  } catch (error) {
    console.error("SERVERLESS FUNCTION CRASH:", error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: "Alchemy failed: " + (error.message || "Unknown error") }) 
    };
  }
};