const fs = require('fs');
const content = fs.readFileSync('catalogo_meta.csv', 'utf-8');
const cleanContent = content.replace(/^\uFEFF/, '');

const items = [];
let inQuotes = false;
let currentField = '';
let currentRecord = [];

for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    if (char === '"') {
        inQuotes = !inQuotes;
        // optionally, don't add the quote to currentField if we just want raw string
        // but it's easier to just strip them at the end.
        currentField += char;
    } else if (char === ',' && !inQuotes) {
        currentRecord.push(currentField);
        currentField = '';
    } else if (char === '\n' && !inQuotes) {
        currentRecord.push(currentField);
        if (currentRecord.length >= 6) {
            const firstField = currentRecord[0].replace(/^"|"$/g, '');
            if (firstField !== 'id') {
                const title = currentRecord[1].replace(/^"|"$/g, '');
                const price = currentRecord[5].replace(/^"|"$/g, '');
                items.push(`- ${title} | Preço: ${price}`);
            }
        }
        currentRecord = [];
        currentField = '';
    } else {
        currentField += char;
    }
}
// Handle last record
if (currentField !== '' || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.length >= 6) {
        const firstField = currentRecord[0].replace(/^"|"$/g, '');
        if (firstField !== 'id') {
            const title = currentRecord[1].replace(/^"|"$/g, '');
            const price = currentRecord[5].replace(/^"|"$/g, '');
            items.push(`- ${title} | Preço: ${price}`);
        }
    }
}

console.log("Total items:", items.length);
console.log("Items:");
console.log(items.join('\n'));
