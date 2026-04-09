const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('Basil_Operational_Blueprint.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error("Error reading PDF:", err);
});
