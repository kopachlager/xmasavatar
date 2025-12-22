
/**
 * Transforms a base64 image into a Christmas avatar by calling the Netlify serverless function.
 */
export async function transformToChristmasAvatar(
  base64Image: string,
  themePrompt: string
): Promise<string> {
  try {
    const response = await fetch('/.netlify/functions/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        prompt: themePrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error: any) {
    console.error("Transformation Error:", error);
    // If the function is not found (e.g. local dev without netlify cli), 
    // we could fallback to the old method, but for now we follow the user's "setup properly" request.
    throw new Error(error.message || "The ritual was interrupted by a spectral error.");
  }
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
