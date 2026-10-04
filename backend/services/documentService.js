const crypto = require("crypto");

const { processPDF } = require("./pdfServices");
const { processImage } = require("./imageService");
const { processTables } = require("./tableService");

function normalizeChunk(chunk, {
  documentId,
  source,
  type,
  page,
}) {
  return {
    ...chunk,

    chunkId:
      chunk.chunkId ||
      crypto.randomUUID(),

    documentId,

    metadata: {
      ...chunk.metadata,

      source,

      type:
        type ||
        chunk.metadata?.type ||
        "text",

      page:
        page ||
        chunk.metadata?.page ||
        chunk.metadata?.loc?.pageNumber ||
        0,
    },
  };
}

async function processDocument(
  filePath,
  mimeType,
  originalName,
  documentId
) {
  if (mimeType === "application/pdf") {
    const result = await processPDF(
      filePath,
      originalName
    );

    return result.chunks.map((chunk) =>
      normalizeChunk(chunk, {
        documentId,
        source: originalName,
        type:
          chunk.metadata?.type ||
          "text",
        page:
          chunk.metadata?.page ||
          chunk.metadata?.loc?.pageNumber ||
          0,
      })
    );
  }

  if (mimeType.startsWith("image/")) {
    const imageResult = await processImage(
      filePath,
      mimeType
    );

    const chunks = [];

    if (
      imageResult.text &&
      imageResult.text.trim()
    ) {
      chunks.push({
        pageContent: imageResult.text,

        metadata: {
          source: originalName,
          type: "text",
          page: 1,
        },
      });
    }

    if (imageResult.tables?.length > 0) {
      chunks.push(
        ...processTables(
          imageResult.tables,
          {
            source: originalName,
            page: 1,
          }
        )
      );
    }

    if (imageResult.visuals?.length > 0) {
      imageResult.visuals.forEach(
        (visual, index) => {
          if (
            visual.description?.trim()
          ) {
            chunks.push({
              pageContent:
                visual.description,

              metadata: {
                source: originalName,
                type: "visual",
                visualType:
                  visual.type,
                visualIndex: index,
                page: 1,
              },
            });
          }
        }
      );
    }

    return chunks.map((chunk) =>
      normalizeChunk(chunk, {
        documentId,
        source: originalName,
        type:
          chunk.metadata?.type ||
          "text",
        page:
          chunk.metadata?.page || 1,
      })
    );
  }

  throw new Error(
    `Unsupported file type: ${mimeType}`
  );
}

module.exports = {
  processDocument,
};