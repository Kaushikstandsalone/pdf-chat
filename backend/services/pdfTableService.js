const fs = require("fs");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");

async function extractPDFTables(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));

  const pdf = await pdfjsLib.getDocument({
    data,
  }).promise;

  const tables = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const content = await page.getTextContent();

    const items = content.items
      .filter((item) => item.str && item.str.trim())
      .map((item) => ({
        text: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
      }));

    console.log(
      `Page ${pageNum}: extracted ${items.length} text items`
    );

    const rows = groupIntoRows(items);

    console.log(`Page ${pageNum}: detected ${rows.length} rows`);

    const pageTables = detectTables(rows);

    for (const table of pageTables) {
      tables.push({
        ...table,
        page: pageNum,
      });
    }
  }

  return tables;
}

function groupIntoRows(items) {
  const tolerance = 5;

  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > tolerance) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });

  const rows = [];

  for (const item of sorted) {
    let row = rows.find(
      (r) => Math.abs(r.y - item.y) <= tolerance
    );

    if (!row) {
      row = {
        y: item.y,
        items: [],
      };

      rows.push(row);
    }

    row.items.push(item);
  }

  rows.sort((a, b) => b.y - a.y);

  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);

    return row.items;
  });
}

function detectTables(rows) {
  if (rows.length < 2) {
    return [];
  }

  const tables = [];

  let currentTable = [];

  for (const row of rows) {
    if (row.length >= 2) {
      currentTable.push(row);
    } else {
      if (currentTable.length >= 2) {
        tables.push(convertRowsToTable(currentTable));
      }

      currentTable = [];
    }
  }

  if (currentTable.length >= 2) {
    tables.push(convertRowsToTable(currentTable));
  }

  return tables;
}

function convertRowsToTable(rows) {
  const tableRows = rows.map((row) =>
    row.map((item) => item.text)
  );

  return {
    title: "",
    headers: tableRows[0] || [],
    rows: tableRows.slice(1),
  };
}

module.exports = {
  extractPDFTables,
};