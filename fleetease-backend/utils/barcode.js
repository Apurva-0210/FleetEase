const bwipjs = require('bwip-js');

async function generateBarcodePNG(text = 'FLEETEASE') {
  return bwipjs.toBuffer({ bcid: 'code128', text, scale: 3, height: 10, includetext: true, textxalign: 'center' });
}

module.exports = { generateBarcodePNG };
