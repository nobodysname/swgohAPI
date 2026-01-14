// cacheImages.js
const fs = require('fs');
const axios = require('axios');

// --- CONFIG ---
const INPUT_FILE = './data/TestData.json';
const METADATA_FILE = './data/Metadata.json';
const OUTPUT_FILE = './data/ImagesData.json';
const CONCURRENCY_LIMIT = 5; 
const ASSET_SERVER_URL = 'http://164.30.71.107:3001/Asset/single';


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- DER RAM SPEICHER (Singleton) ---
let internalCache = {};

// Initiales Laden beim Start (damit sofort was da ist)
try {
  if (fs.existsSync(OUTPUT_FILE)) {
    internalCache = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`📦 Cache Initialisiert: ${Object.keys(internalCache).length} Bilder.`);
  }
} catch (e) { console.error("Konnte Cache nicht initial laden", e.message); }


// --- UPDATE FUNKTION (wird von api2.js aufgerufen) ---
async function runImageCache() {
  console.log('🔄 Starte Image-Update im Hintergrund...');

  if (!fs.existsSync(INPUT_FILE) || !fs.existsSync(METADATA_FILE)) {
    console.error('❌ Input Dateien fehlen.');
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
  const version = metadata.assetVersion;

  // Liste erstellen
  const unitsToProcess = rawData.map(unit => {
    const thumbnailName = unit.members?.[0]?.thumbnailName;
    return {
      name: unit.name,
      assetName: thumbnailName.replace(/^tex\./, '')
    };
  }).filter(u => u.assetName);

  // Wir nutzen den aktuellen Cache als Basis, damit wir nicht alles neu laden müssen
  let newCache = { ...internalCache };
  let changes = 0;

  // Nur neue Bilder laden
  const queue = unitsToProcess.filter(u => !newCache[u.assetName]);
  
  if (queue.length > 0) {
      console.log(`⬇️  Lade ${queue.length} neue Bilder herunter...`);
      for (let i = 0; i < queue.length; i += CONCURRENCY_LIMIT) {
        const chunk = queue.slice(i, i + CONCURRENCY_LIMIT);
        const promises = chunk.map(unit => downloadImage(unit, version));
        
        const results = await Promise.all(promises);
        
        results.forEach((res) => {
            if (res) {
                newCache[res.thumbnailName] = res; // Key ist assetName
                changes++;
            }
        });
        await sleep(200); 
      }
      
      // Speichern auf Disk
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(newCache, null, 2), 'utf-8');
      
      // WICHTIG: Den RAM aktualisieren!
      internalCache = newCache;
      console.log(`✅ Update fertig. ${changes} neue Bilder. RAM aktualisiert.`);
  } else {
      console.log('✅ Keine neuen Bilder erforderlich. RAM ist aktuell.');
      // Trotzdem updaten, falls TestData neue Units hatte, die wir schon kannten
      internalCache = newCache; 
  }
}

async function downloadImage(unit, version) {
  try {
    const response = await axios({
      method: 'get',
      url: ASSET_SERVER_URL,
      params: { version: version, assetName: unit.assetName },
      responseType: 'arraybuffer',
      timeout: 10000
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return {
      thumbnailName: unit.assetName,
      base64: `data:image/png;base64,${base64}`
    };
  } catch (error) { return null; }
}

// --- GETTER (wird von api.js/server.js aufgerufen) ---
function getImageFromRam(assetName) {
    // Falls "tex." fehlt, ergänzen wir es hier flexibel
    return internalCache[assetName];
}

module.exports = { runImageCache, getImageFromRam };