const fs = require('fs');
const zlib = require('zlib');

const lottieFile = 'src/assets/loading/STUDENT.lottie';

// It's a zip file. Let's use a simple approach to extract if it's uncompressed or use zlib if we can, 
// actually node doesn't have a built-in zip extractor that is simple. 
// Let's use `unzip` command if available, or just use python since I can write a better python script.
