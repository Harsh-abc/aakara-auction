export const csvCell = (value) => {
    if (value === null || value === undefined) return "";
    let text = typeof value === "object" ? JSON.stringify(value) : String(value);
    // stop a spreadsheet reading "=HYPERLINK(…)" typed into a field as a formula
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** A CSV document (BOM so Excel reads names in UTF-8) */
export const toCsv = (header, rows) => "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
