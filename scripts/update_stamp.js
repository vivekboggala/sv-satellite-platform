const fs = require('fs');

const targetFile = 'D:/Dish/DishCustomerApp/src/utils/invoiceAssets.js';
const base64File = 'D:/Dish/new_stamp_b64.txt';

const newB64 = fs.readFileSync(base64File, 'utf8').trim();
let content = fs.readFileSync(targetFile, 'utf8');

const startMarker = "export const imgStamp = 'data:image/png;base64,";
const endMarker = "';";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error('Start marker not found');
    process.exit(1);
}

const rest = content.substring(startIndex + startMarker.length);
const endIndex = rest.indexOf(endMarker);

if (endIndex === -1) {
    console.error('End marker not found');
    process.exit(1);
}

const oldDef = content.substring(startIndex, startIndex + startMarker.length + endIndex + endMarker.length);
const newDef = startMarker + newB64 + endMarker;

const newContent = content.replace(oldDef, newDef);
fs.writeFileSync(targetFile, newContent);

console.log('SUCCESS: imgStamp updated in invoiceAssets.js');
console.log('New base64 length:', newB64.length);
