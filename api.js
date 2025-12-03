const fs = require('fs')
const axios = require('axios')
const service = require('./service/service')

const MSGPACK_FILE = './data/GuildData.json'
const MSGPACK_FILE2 = './data/PlayerData.json'
const MSGPACK_FILE3 = './data/DataData.json'
const FETCH_INTERVAL = 60 * 60 * 1000 // 60 Minuten in Millisekunden
var player;
const data = {
  gameVersion: "",
  localVersion: "" 
}

// Funktion, um die Guild-Daten zu holen und als JSON zu speichern
async function fetchAndSaveGuild() {
  try {
    const response = await axios.post('http://164.30.71.107:3200/guild', {
      payload: {
        guildId: 'NzjDFToSTi-r0Z2Sf37XpQ',
        includeRecentGuildActivityInfo: true,
      },
      enums: false,
    })

    let data = response.data

    data = service.convertGuild(data)

    player = data.guild.member.map((m) => m.playerId)

    // In MessagePack speichern
    fs.writeFileSync(MSGPACK_FILE, JSON.stringify(data, null, 2), 'utf-8')

    console.log(
      `[${new Date().toLocaleTimeString()}] Guild-Daten gespeichert`,
    )
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Guild-Daten:`,
      error.message,
    )
  }
}

async function fetchAndSavePlayer() {
  try {
    const requests = player.map((id) =>
      axios.post('http://164.30.71.107:3200/player', {
        payload: { playerId: id },
        enums: false,
      })
      .then(res => res.data) // nur die Daten extrahieren
      .catch(err => {
        console.error(`Fehler bei playerId ${id}:`, err.message)
        return null // Fehlerhafte Requests als null markieren
      })
    )
    let responses = await Promise.all(requests)

    responses = service.convertPlayer(responses)

    fs.writeFileSync(MSGPACK_FILE2, JSON.stringify(responses, null, 2), 'utf-8')
    console.log(
      `[${new Date().toLocaleTimeString()}] Player-Daten gespeichert`,
    )
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Player-Daten:`,
      err.message,
    )
  }
}

async function getLocalizationData() {
  try{
      const response = await axios.post("http://164.30.71.107:3200/localization", {
          payload: {
              id: data.localVersion + ':ENG_US'
            },
            unzip: true
      })
      const text = response.data['Loc_ENG_US.txt']
      const filtered = service.filterUnitNames(text);
      
      fs.writeFileSync('./data/Localization.json', JSON.stringify(filtered, null, 2), 'utf-8')
      console.log(
          `[${new Date().toLocaleTimeString()}] Localization-Daten gespeichert`,
          )

  } catch (err) {
      console.error(
          `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Localization-Daten:`,
          err.message,
          )
  }
}

async function getMetadata() {
  try{
    const response = await axios.post("http://localhost:3200/metadata")
    data.gameVersion = response.data.latestGamedataVersion
    data.localVersion = response.data.latestLocalizationBundleVersion
    console.log(
      `[${new Date().toLocaleTimeString()}] Metadaten geprüft`,
      )
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Metadaten:`,
      err.message,
      )
  }
}

async function getGameData() {
  try{
      const response = await axios.post('http://164.30.71.107:3200/data', {
              payload: {
                  version: data.gameVersion,
                  includePveUnits: false,
              requestSegment: 3
          },
          enums: false
      })
      let temp = response.data
      
      temp = service.convertData(temp)
      
      fs.writeFileSync(MSGPACK_FILE3, JSON.stringify(temp, null, 2), 'utf-8')
      console.log(
      `[${new Date().toLocaleTimeString()}] Game-Daten gespeichert`,
      )
  } catch (err) {
      console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Game-Daten:`,
      err.message,
      )
  }
}

function formatData() {
  try {
    const player = JSON.parse(fs.readFileSync("./data/PlayerData.json"))
    const data = JSON.parse(fs.readFileSync("./data/DataData.json"))
    const local = JSON.parse(fs.readFileSync("./data/Localization.json", "utf8"))
    const connectedData = service.connectData(player, data, local)
    delete player 
    delete data
    delete local
    const connected = service.connectUnits(connectedData)
    fs.writeFileSync('./data/TestData.json', JSON.stringify(connected, null, 2), 'utf-8')

    console.log(
      `[${new Date().toLocaleTimeString()}] Daten formartiert`,
      )
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Formartieren der Daten:`,
      error.message,
      )
  }
}

async function updateAll(){
  await fetchAndSaveGuild()
  await fetchAndSavePlayer()
  await getMetadata()
  await getGameData()
  await getLocalizationData()
  formatData()
}

updateAll()


// Danach alle 5 Minuten wiederholen
setInterval(updateAll, FETCH_INTERVAL)

console.log('Guild-Daten Auto-Fetch läuft alle 5 Minuten...')
