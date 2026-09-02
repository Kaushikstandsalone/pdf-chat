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
You are a helpful assistant that answers questions based on the provided PDF context.

PDF Context:
${context}

Previous Conversation:
${previousConversation || "No previous conversation."}

Current Question:
${question}

Instructions:
- Answer using the provided PDF context.
- Use the previous conversation to understand references and follow-up questions.
- If the answer cannot be found in the PDF context, say you don't know based on the PDF.
- Do not make up information.
- Give a clear and concise answer.
`;

  const response = await model.invoke(prompt);

  return response.content;
}

module.exports = { generateAnswer };