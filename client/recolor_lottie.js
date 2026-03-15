const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const lottiePath = path.join(__dirname, 'src', 'assets', 'loading', 'STUDENT.lottie');

async function extractAndParse() {
  try {
    const data = fs.readFileSync(lottiePath);
    const zip = await JSZip.loadAsync(data);
    
    // Find the main animation JSON
    let animFileName;
    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith('animations/') && relativePath.endsWith('.json')) {
        animFileName = relativePath;
      }
    });

    if (!animFileName) {
      console.log('No animation JSON found');
      return;
    }

    const animContent = await zip.file(animFileName).async('string');
    const animData = JSON.parse(animContent);

    // List layers
    const layerNames = [];
    if (animData.layers) {
      for (const layer of animData.layers) {
        if (layer.nm) {
          layerNames.push(layer.nm);
        }
      }
    }
    console.log('\n--- Layer Names ---');
    console.log(layerNames.join(', '));
    console.log('-------------------\n');

  } catch (err) {
    console.error('Error extracting lottie:', err);
  }
}

extractAndParse();
