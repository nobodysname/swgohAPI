const fs = require("fs");
const axios = require("axios");
const service = require("./service/service");
const COMLINK_BASE = "http://164.30.71.107:3200";
const { runImageCache } = require("./cacheImages"); // <--- IMPORTIEREN

const MSGPACK_FILE = "./data/GuildData.json";
const MSGPACK_FILE2 = "./data/PlayerData.json";
const MSGPACK_FILE3 = "./data/DataData.json";
const MSGPACK_FILE4 = "./data/SkillData.json";
const MSGPACK_FILE5 = "./data/TBData.json";
const MSGPACK_FILE6 = "./data/Metadata.json";
const FETCH_INTERVAL = 30 * 60 * 1000; // 30 Minuten in Millisekunden
var player;
var latestGameVersion = "";
const data = {
  gameVersion: "",
  localVersion: "",
};


// Funktion, um die Guild-Daten zu holen und als JSON zu speichern
async function fetchAndSaveGuild() {
  try {
    const response = await axios.post(`${COMLINK_BASE}/guild`, {
      payload: {
        guildId: "NzjDFToSTi-r0Z2Sf37XpQ",
        includeRecentGuildActivityInfo: true,
      },
      enums: false,
    });

    let data = response.data;

    data = service.convertGuild(data);

    player = data.guild.member.map((m) => m.playerId);

    // In MessagePack speichern
    fs.writeFileSync(MSGPACK_FILE, JSON.stringify(data, null, 2), "utf-8");

    console.log(`[${new Date().toLocaleTimeString()}] Guild-Daten gespeichert`);
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Guild-Daten:`,
      error.message
    );
  }
}

async function fetchAndSavePlayer() {
  try {
    const requests = player.map((id) =>
      axios
        .post(`${COMLINK_BASE}/player`, {
          payload: { playerId: id },
          enums: false,
        })
        .then((res) => res.data) // nur die Daten extrahieren
        .catch((err) => {
          console.error(`Fehler bei playerId ${id}:`, err.message);
          return null; // Fehlerhafte Requests als null markieren
        })
    );
    let responses = await Promise.all(requests);

    responses = service.convertPlayer(responses);
    const skills = JSON.parse(fs.readFileSync("./data/SkillData.json", "utf8"));
    responses = service.expandSkills(responses, skills);

    fs.writeFileSync(
      MSGPACK_FILE2,
      JSON.stringify(responses, null, 2),
      "utf-8"
    );
    console.log(
      `[${new Date().toLocaleTimeString()}] Player-Daten gespeichert`
    );
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Player-Daten:`,
      err.message
    );
  }
}

async function getLocalizationData() {
  try {
    const response = await axios.post(`${COMLINK_BASE}/localization`, {
      payload: {
        id: data.localVersion + ":ENG_US",
      },
      unzip: true,
    });
    const text = response.data["Loc_ENG_US.txt"];
    const filtered = service.filterUnitNames(text);
    const tbFiltered = service.filterTerritoryNames(text);

    fs.writeFileSync(
      "./data/TBLocalization.json",
      JSON.stringify(tbFiltered, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      "./data/Localization.json",
      JSON.stringify(filtered, null, 2),
      "utf-8"
    );
    console.log(
      `[${new Date().toLocaleTimeString()}] Localization-Daten gespeichert`
    );
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Localization-Daten:`,
      err.message
    );
  }
}

async function getMetadata() {
  try {
    const response = await axios.post(`${COMLINK_BASE}/metadata`);
    data.gameVersion = response.data.latestGamedataVersion;
    data.localVersion = response.data.latestLocalizationBundleVersion;
    fs.writeFileSync(
      MSGPACK_FILE6,
      JSON.stringify(response.data, null, 2),
      "utf-8"
    );
    console.log(`[${new Date().toLocaleTimeString()}] Metadaten geprüft`);
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Metadaten:`,
      error.message
    );
  }
}

async function getGameData() {
  try {
    const response = await axios.post(`${COMLINK_BASE}/data`, {
      payload: {
        version: data.gameVersion,
        includePveUnits: false,
        requestSegment: 3,
      },
      enums: false,
    });
    let temp = response.data;

    temp = service.convertData(temp);

    fs.writeFileSync(MSGPACK_FILE3, JSON.stringify(temp, null, 2), "utf-8");
    console.log(`[${new Date().toLocaleTimeString()}] Game-Daten gespeichert`);
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Game-Daten:`,
      err.message
    );
  }
}

async function getSkillData() {
  try {
    const response = await axios.post(`${COMLINK_BASE}/data`, {
      payload: {
        version: data.gameVersion,
        includePveUnits: false,
        requestSegment: 1,
      },
      enums: false,
    });
    //const temp = service.convertSkillData(response.data)
    let temp = response.data.skill;

    fs.writeFileSync(MSGPACK_FILE4, JSON.stringify(temp, null, 2), "utf-8");
    console.log(
      `[${new Date().toLocaleTimeString()}] SkillGame-Daten gespeichert`
    );
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Game-Daten:`,
      err.message
    );
  }
}

async function getTBData() {
  try {
    let response = await axios.post("http://164.30.71.107:3200/data", {
      payload: {
        version: data.gameVersion,
        includePveUnits: true,
        items: "536870912",
      },
      enums: false,
    });
    let tables = await axios.post("http://164.30.71.107:3200/data", {
      payload: {
        version: data.gameVersion,
        includePveUnits: true,
        items: "32",
      },
      enums: false,
    });
    let temp = response.data.territoryBattleDefinition[4];
    temp.strikeZoneDefinition = service.expandSZData(
      temp.strikeZoneDefinition,
      tables.data.table
    );
    tables = null;
    fs.writeFileSync(MSGPACK_FILE5, JSON.stringify(temp, null, 2), "utf-8");
    console.log(
      `[${new Date().toLocaleTimeString()}] TBGame-Daten gespeichert`
    );
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der TB-Daten:`,
      err.message
    );
  }
}

async function formatData() {
  try {
    let player = JSON.parse(fs.readFileSync("./data/PlayerData.json"));
    let data = JSON.parse(fs.readFileSync("./data/DataData.json"));
    let local = JSON.parse(fs.readFileSync("./data/Localization.json", "utf8"));
    const connectedData = service.connectData(player, data, local);
    player = null;
    data = null;
    local = null;
    const connected = service.connectUnits(connectedData);
    fs.writeFileSync(
      "./data/TestData.json",
      JSON.stringify(connected, null, 2),
      "utf-8"
    );

    console.log(`[${new Date().toLocaleTimeString()}] Daten formartiert`);

    // HIER IST DER NEUE AUFRUF:
    // Nachdem TestData.json geschrieben wurde, updaten wir den Cache
    await runImageCache(); 

  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Formatieren/Caching:`,
      error.message
    );
  }
}

async function updateAll() {
  await getMetadata();
  if (latestGameVersion !== data.gameVersion) {
    await getGameData();
    await getSkillData();
    await getLocalizationData();
    await getTBData();
    latestGameVersion = data.gameVersion;
  }
  await fetchAndSaveGuild();
  await fetchAndSavePlayer();
  await formatData();
}

updateAll();

// Danach alle 5 Minuten wiederholen
setInterval(updateAll, FETCH_INTERVAL);

console.log("Guild-Daten Auto-Fetch läuft alle 30 Minuten...");
