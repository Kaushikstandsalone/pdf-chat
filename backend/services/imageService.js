const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function processImage(filePath, mimeType) {
  const imageData = fs.readFileSync(filePath, {
    encoding: "base64",
  });

  const response = await ai.interactions.create({
    model: "gemini-3.8-flash",

    input: [
      {
        type: "text",
        text: `
Analyze this image as a document.

Identify and extract the following if present:

1. Text
2. Tables
3. Charts or graphs
4. Diagrams
5. Other important visual information

Return ONLY valid JSON in the following format:

{
  "type": "document",
  "text": "...",
  "tables": [
    {
      "title": "...",
      "headers": ["...", "..."],
      "rows": [
        ["...", "..."],
        ["...", "..."]
      ]
    }
  ],
  "visuals": [
    {
      "type": "chart|diagram|other",
      "description": "..."
    }
  ]
}

Rules:

- Extract text accurately.
- If there is no meaningful text, use an empty string.
- If there are no tables, return an empty array.
- If there are no visuals, return an empty array.
- Preserve table headers exactly.
- Preserve table rows and columns exactly.
- Preserve numerical values exactly.
- Do NOT invent missing or unreadable values.
- If a table cell cannot be read, use "[unreadable]".
- Describe charts and diagrams accurately.
- Return ONLY JSON. Do not use markdown code fences.
        `,
      },
      {
        type: "image",
        data: imageData,
        mime_type: mimeType,
      },
    ],
  });

  const output = response.output_text;

  try {
    const result = JSON.parse(output);

return {
  type: "image",
  text: result.text || "",
  tables: result.tables || [],
  visuals: result.visuals || [],
  source: mimeType,
};
  } catch (error) {
    console.error("Failed to parse Gemini image response as JSON:");
    console.error(output);

    throw new Error(
      "Gemini returned an invalid structured response for the image"
    );
  }
}

module.exports = {
  processImage,
};