require("dotenv").config();

const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

async function createIndex() {
    try {
        await pc.createIndex({
            name: "pdf-chat",
            dimension: 768,
            metric: "cosine",
            spec: {
                serverless: {
                    cloud: "aws",
                    region: "us-east-1",
                },
            },
        });

        console.log("Index creation started!");
    } catch (error) {
        console.error("Error creating index:", error);
    }
}

createIndex();