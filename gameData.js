const fs = require('fs')
const axios = require('axios')
const service = require('./service/service')

const MSGPACK_FILE = './data/DataData.json'
const FETCH_INTERVAL = 24 * 60 * 60 * 1000 // 5 Minuten in Millisekunden


async function getGameData() {
    try{
        const response = await axios.post('http://localhost:3200/data', {
                payload: {
                    version: "0.38.1:tRRP1Q9rRiOiE1suT9tJ3g",
                    includePveUnits: false,
                requestSegment: 0
            },
            enums: false
        })
        let data = response.data

        data = service.convertData(data)

        fs.writeFileSync(MSGPACK_FILE, JSON.stringify(data, null, 2), 'utf-8')
        console.log(
        `[${new Date().toLocaleTimeString()}] Game-Daten gespeichert`,
        )
        try{
            const response = await axios.post("http://localhost:3200/localization", {
                payload: {
                    id: 'uzGy4k4URUu4jpfekh7GMQ:ENG_US'
                  },
                  unzip: true
            })
            const text = response.data['Loc_ENG_US.txt']
            const filtered = service.filterUnitNames(text);
            
            fs.writeFileSync('./data/Localization.json', JSON.stringify(filtered, null, 2), 'utf-8')


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
                `[${new Date().toLocaleTimeString()}] Localization-Daten gespeichert`,
                )

        } catch (err) {
            console.error(
                `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Localization-Daten:`,
                err.message,
                )
        }
    } catch (err) {
        console.error(
        `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der Game-Daten:`,
        err.message,
        )
    }
}

getGameData()

setInterval(getGameData, FETCH_INTERVAL)

console.log("Game-Daten Auto-Fetch läuft alle 24 Stunden...")