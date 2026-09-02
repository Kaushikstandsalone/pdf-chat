const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

async function processPDF(filePath) {
    // Load PDF
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    console.log(`PDF loaded. Pages: ${docs.length}`);

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    console.log(`Created ${chunks.length} chunks`);

    return chunks;
}

module.exports = {
    processPDF,
};