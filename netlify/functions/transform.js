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
      console.error("ENVIRONMENT ERROR: API_KEY is missing in Netlify settings.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error: API Key missing." })
      };
    }

    const body = JSON.parse(event.body);
    const { image, prompt } = body;
    
    if (!image) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: "No image provided for transformation." }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    console.log("Attempting transformation with prompt:", prompt);

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
            text: `Transform this profile picture into a Christmas avatar. Style: ${prompt}. Keep the person's face and identity the same. High quality, square aspect ratio.`,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.find(p => p.inlineData);
    
    if (!part) {
       console.error("AI failed to return image data:", JSON.stringify(candidate));
       return { 
         statusCode: 500, 
         headers,
         body: JSON.stringify({ error: "Transformation failed. Please try a different photo." }) 
       };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        image: `data:image/png;base64,${part.inlineData.data}` 
      }),
    };
  } catch (error) {
    console.error("Function exception:", error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: "The North Pole server had a hiccup: " + error.message }) 
    };
  }
};