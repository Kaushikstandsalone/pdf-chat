function tableToText(table) {
  const headers = table.headers || [];
  const rows = table.rows || [];

  let text = "";

  if (table.title) {
    text += `Table: ${table.title}\n\n`;
  }

  text += `Columns: ${headers.join(" | ")}\n\n`;

  rows.forEach((row) => {
    text += row.join(" | ") + "\n";
  });

  return text;
}

function processTables(tables, metadata = {}) {
  return tables.map((table, index) => {
    return {
      pageContent: tableToText(table),

      metadata: {
        ...metadata,

        type: "table",

        tableIndex: index,

        tableTitle: table.title || `Table ${index + 1}`,

        headers: JSON.stringify(table.headers || []),

        rows: JSON.stringify(table.rows || []),
      },
    };
  });
}

module.exports = {
  tableToText,
  processTables,
};