const fs = require('fs');

const targetFile = 'D:\\Dish\\DishCustomerApp\\src\\utils\\invoiceAssets.js';
const b64File = 'C:\\Users\\vivek\\AppData\\Local\\Temp\\new_stamp_b64.txt';

if (!fs.existsSync(b64File)) {
    console.error('Base64 file not found at', b64File);
    process.exit(1);
}

const newB64 = fs.readFileSync(b64File, 'utf8').trim();
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /export const imgStamp = ['"].*?['"];/;
const replacement = `export const imgStamp = 'data:image/png;base64,${newB64}';`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(targetFile, content);
    console.log('Successfully updated imgStamp in invoiceAssets.js');
} else {
    console.error('Could not find imgStamp export in invoiceAssets.js');
    process.exit(1);
}
