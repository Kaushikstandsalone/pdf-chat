const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-3.6-flash",
  temperature: 0,
});

async function generateAnswer(question, context, history = []) {
  const previousConversation = history
    .map((message) => {
      return `${message.role === "user" ? "User" : "Assistant"}: ${
        message.content
      }`;
    })
    .join("\n")
    .slice(0, 2500);

  const prompt = `
You are a helpful multimodal document assistant.

The user may have uploaded:
- PDF documents
- Images
- Tables
- Charts
- Diagrams
- Other visual document content

Use ONLY the information provided in the retrieved document context.

Retrieved Document Context:
${context}

Previous Conversation:
${previousConversation || "No previous conversation."}

Current Question:
${question}

Instructions:

1. Answer the user's question using the retrieved document context.

2. The context may contain different content types such as:
   - TEXT
   - TABLE
   - VISUAL INFORMATION

3. If the context contains a TABLE:
   - Treat the table structure and values as authoritative.
   - Preserve numerical values accurately.
   - Do not invent missing cells or values.
   - Use the table headers to understand what each value represents.
   - You may compare values and perform simple calculations when necessary.

4. If the context contains VISUAL INFORMATION:
   - Use the provided visual description.
   - Do not invent details that are not present in the context.

5. Use the previous conversation to understand references and follow-up questions.

6. If the answer cannot be determined from the retrieved context, say:
   "I don't know based on the provided documents."

7. Do not use outside knowledge to fill missing information.

8. Give a clear and concise answer.

`;

  const response = await model.invoke(prompt);

  return response.content;
}

module.exports = {
  generateAnswer,
};