const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const {extractPDFTables} = require("./pdfTableService");
const {processTables} = require("./tableService");
async function processPDF(filePath,originalName) {
  const loader = new PDFLoader(filePath);

  const docs = await loader.load();

  console.log(`PDF loaded. Pages: ${docs.length}`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const textChunks = await splitter.splitDocuments(docs);

  console.log(`Created ${textChunks.length} text chunks`);

  const tables = await extractPDFTables(filePath);

  console.log(`Detected ${tables.length} tables`);

  const tableChunks = tables.flatMap((table) =>
  processTables(
    [table],
    {
      source: originalName,
      page: table.page,
    }
  )
);

  return {
  type: "pdf",
  chunks: [
    ...textChunks,
    ...tableChunks,
  ],
};
}

module.exports = {
    processPDF,
};