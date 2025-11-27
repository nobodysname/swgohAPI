const fs = require('fs')
const axios = require('axios')
const service = require('./service/service')

const MSGPACK_FILE = './data/GuildData.json'
const MSGPACK_FILE2 = './data/PlayerData.json'
const FETCH_INTERVAL = 5 * 60 * 1000 // 5 Minuten in Millisekunden

// Funktion, um die Guild-Daten zu holen und als JSON zu speichern
async function fetchAndSaveGuild() {
  try {
    const response = await axios.post('http://localhost:3200/guild', {
      payload: {
        guildId: 'NzjDFToSTi-r0Z2Sf37XpQ',
        includeRecentGuildActivityInfo: true,
      },
      enums: false,
    })

    let data = response.data

    data = service.convertGuild(data)

    var player = data.guild.member.map((m) => m.playerId)

    // In MessagePack speichern
    fs.writeFileSync(MSGPACK_FILE, JSON.stringify(data, null, 2), 'utf-8')

    console.log(
      `[${new Date().toLocaleTimeString()}] Guild-Daten gespeichert`,
    )

    //Abfragen und speichern von Player Daten
    try {
      const requests = player.map((id) =>
        axios.post('http://localhost:3200/player', {
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
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Guild-Daten:`,
      error.message,
    )
  }
}

// Erstes Mal sofort ausführen
fetchAndSaveGuild()

// Danach alle 5 Minuten wiederholen
setInterval(fetchAndSaveGuild, FETCH_INTERVAL)

console.log('Guild-Daten Auto-Fetch läuft alle 5 Minuten...')
