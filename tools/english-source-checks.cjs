'use strict';
// Structural vocabulary evidence only; this does not certify a definition's
// accuracy, lexical novelty or mastery. Never match terms against full prose.
const { marked } = require('../js/vendor/marked.js');
function normalizeLexicalText(value) {
  return String(value ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/[*`]/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({ '&amp;':'&', '&lt;':'<', '&gt;':'>', '&quot;':'"', '&apos;':"'", '&nbsp;':' ' })[entity])
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[‐‑]/g, '-').replace(/\s+/g, ' ').trim();
}
function taughtVocabularyRows(markdown) {
  const entries = new Map();
  for (const table of marked.lexer(markdown, { gfm:true })) {
    if (table.type !== 'table') continue;
    const headers = table.header.map(cell => normalizeLexicalText(cell.text));
    if (!/(?:词|短语|word|phrase|term)/i.test(headers[0] || '')) continue;
    const evidenceColumns = headers.map((header, index) => index > 0 && /(?:义|意思|用法|搭配|例句|语境|形态|meaning|definition|usage|use|collocation|example)/i.test(header) ? index : -1).filter(index => index >= 0);
    if (!evidenceColumns.length) continue;
    for (const row of table.rows) {
      const cells = row.map(cell => normalizeLexicalText(cell.text));
      const term = cells[0];
      // Explicitly labelled meaning/usage columns must contain real text.
      // Part-of-speech-only and empty rows are not taught-term evidence.
      if (!term || !evidenceColumns.every(index => cells[index] && !/^[-–—\s]+$/.test(cells[index]))) continue;
      if (!entries.has(term)) entries.set(term, []);
      entries.get(term).push({ headers, cells });
    }
  }
  return entries;
}
module.exports = { normalizeLexicalText, taughtVocabularyRows };
