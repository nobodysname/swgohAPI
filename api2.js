// api.js
const express = require("express")
const fs = require("fs");
const service = require("./service/service");
const { default: axios } = require("axios");
const strategyAuth = require('./strategyAuth')
const { db } = require('./db')

const router = express.Router();

router.post("/getGuild", async (req, res) => {
  try { 
    if(fs.existsSync("./data/latestGuild.json")){
      try {
        const file = fs.readFileSync("./data/latestGuild.json")
        const last = JSON.parse(file)
        if(last.name === req.body.name || !req.body.name) {
          res.send(last.data)
          return;
        } 
      } catch (error) {
        console.error("Fehler beim Lesen der fremnden Guilddatei:", err.message)
        res.status(500).json({ error: "Fehler beim Lesen der fremnden Guilddatei: " + err.message })
      }
      
    }
    console.log("ID: ", req.body)
    const response = await axios.post("http://164.30.71.107:3200/guild", {
      payload: {
        guildId: req.body.id,
        includeRecentGuildActivityInfo: true,
      },
      enums: false,
    })
    const convertedData = service.convertGuild(response.data)
    delete response
    const guildmember = convertedData.guild.member.map((m) => m.playerId)
    delete convertedData
    const player = await fetchAndSavePlayer(guildmember)
    delete guildmember
    const data = JSON.parse(fs.readFileSync("./data/DataData.json"))
    const local = JSON.parse(fs.readFileSync("./data/Localization.json", "utf8"))
    const connectedData = service.connectData(player, data, local)
    delete player 
    delete data
    delete local
    let connected = service.connectUnits(connectedData)  
    res.send(connected)
    const result = { name: req.body.name , data: connected}
    fs.writeFileSync('./data/latestGuild.json', JSON.stringify(result, null, 2), 'utf-8')
  
  } catch (err) {
    console.error("Fehler beim Lesen der fremnden Guilde:", err.message)
    res.status(500).json({ error: "Fehler beim Lesen der Guildnamen: " + err.message })
  }
})

router.post("/getGuildName", async (req, res) => {
  try { 
    const response = await axios.post("http://164.30.71.107:3200/getGuilds", {
      payload: { 
        filterType: 4,
        count: 10,
        name: req.body.name
       },
        enums: false,
    })
    const filtered = service.filterGuildNames(response.data.guild)
    res.send(filtered)
  } catch (err) {
    console.error("Fehler beim Lesen der Guildennamen:", err.message);
    res.status(500).json({ error: "Fehler beim Lesen der Guildnamen: "+ err.message });
  }
})

router.get("/guilds", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/GuildData.json", 'utf-8'));
    res.send(raw)
    console.log("GET /guilds 200")
  } catch (err) {
    console.error("Fehler beim Lesen der Guilddatei:", err.message);
    res.status(500).json({ error: "Fehler beim Lesen der Guilddatei: "+ err.message });
  }
});

router.get("/player", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/PlayerData.json", 'utf-8'));
    res.send(raw)
    console.log("GET /player 200")
  } catch (err) {
    console.error("Fehler beim Lesen der Playerdatei:", err.message);
    res.status(500).json({ error: "Fehler beim Lesen der Playerdatei: "+ err.message });
  }
});

router.get("/data", async (req,res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/DataData.json", 'utf-8'));
    res.send(raw)
    console.log("GET /data 200")
  } catch (err) {
    console.error("Fehler beim Lesen der Datadatei:", err.message);
    res.status(500).json({ error: "Fehler beim Lesen der Datadatei: "+ err.message });
  }
})

router.get("/guildroster", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/TestData.json", 'utf-8'))
    const wantedNames = ["Supreme Leader Kylo Ren", "Jedi Master Luke Skywalker", "Rey", "Ahsoka Tano", "Pirate King Hondo Ohnaka", "Sith Eternal Emperor", "Jedi Master Kenobi", "Jabba the Hutt", "Lord Vader", "Leia Organa", "Leviathan", "Executor", "Profundity", "Third Sister"]
    let result = raw.filter(unit =>
      wantedNames.includes(unit.name)
    );
    result = result
            .sort((a, b) => a.name.localeCompare(b.name));
    res.send(result)
    console.log("GET /guildroster")
  } catch (err) {
    console.error("Fehler beim berechnen des Guildroster:", err.message);
    res.status(500).json({ error: "Fehler beim berechnen des Guildroster: "+ err.message });
  }
})

router.get("/units", (req, res) => {
  try {
    let raw = JSON.parse(fs.readFileSync("./data/TestData.json", 'utf-8'))
    raw = raw
        .sort((a, b) => a.name.localeCompare(b.name));
    res.send(raw)
    console.log("GET /units")
  } catch (err) {
    console.error("Fehler beim berechnen der Units:", err.message);
    res.status(500).json({ error: "Fehler beim berechnen der Units: "+ err.message });
  }
})

// routes/strategy.js

router.get('/strategy/:templateId', strategyAuth('viewer'), (req, res) => {
  const templateId = Number(req.params.templateId)

  const template = db.prepare(`
    SELECT * FROM strategy_templates WHERE id = ?
  `).get(templateId)

  if (!template) {
    return res.status(404).json({ error: 'Template not found' })
  }

  const zones = db.prepare(`
    SELECT z.id as zoneId, z.zone_key, r.*
    FROM strategy_zones z
    LEFT JOIN strategy_rows r ON r.zone_id = z.id
    WHERE z.template_id = ?
    ORDER BY z.zone_key, r.position
  `).all(templateId)

  // Strukturieren
  const structured = {}
  for (const row of zones) {
    if (!structured[row.zone_key]) {
      structured[row.zone_key] = []
    }

    if (row.id) {
      structured[row.zone_key].push({
        rowKey: row.row_key,
        team: row.team_name,
        amount: row.amount,
        note: row.note,
        position: row.position,
        rowId: row.id
      })
    }    
  }

  res.json({
    role: req.strategyRole,
    template,
    zones: structured
  })
})

router.put('/strategy/row/:rowId', strategyAuth('admin'), (req, res) => {
  const rowId = Number(req.params.rowId)
  const { team, amount, note } = req.body

  db.prepare(`
    UPDATE strategy_rows
    SET team_name = ?, amount = ?, note = ?
    WHERE id = ?
  `).run(team ?? '', amount ?? '', note ?? '', rowId)

  console.log("PUT /Strategy/row")
  res.json({ success: true })
})

router.post('/strategy/template', strategyAuth('admin'), (req, res) => {
  const { name, description } = req.body

  const result = db.prepare(`
    INSERT INTO strategy_templates (name, description)
    VALUES (?, ?)
  `).run(name, description ?? '')

  res.json({ templateId: result.lastInsertRowid })
})

router.post('/strategy/row', strategyAuth('admin'), (req, res) => {
  const { zone, team, amount, note } = req.body

  if (!zone) {
    return res.status(400).json({ error: 'zone required' })
  }

  // Zone-ID holen
  const zoneRow = db.prepare(`
    SELECT id FROM strategy_zones WHERE zone_key = ?
  `).get(zone)

  if (!zoneRow) {
    return res.status(404).json({ error: 'Zone not found' })
  }

  // nächste Position bestimmen
  const maxPos = db.prepare(`
    SELECT COALESCE(MAX(position), -1) AS maxPos
    FROM strategy_rows
    WHERE zone_id = ?
  `).get(zoneRow.id).maxPos

  const result = db.prepare(`
    INSERT INTO strategy_rows (zone_id, row_key, team_name, amount, note, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    zoneRow.id,
    crypto.randomUUID(),
    team ?? '',
    amount ?? '',
    note ?? '',
    maxPos + 1
  )

  res.json({
    rowId: result.lastInsertRowid,
    team: team ?? '',
    amount: amount ?? '',
    note: note ?? '',
    position: maxPos + 1
  })
})

router.delete('/strategy/row/:rowId', strategyAuth('admin'), (req, res) => {
  const rowId = Number(req.params.rowId)

  const result = db.prepare(`
    DELETE FROM strategy_rows
    WHERE id = ?
  `).run(rowId)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Row not found' })
  }

  res.json({ success: true })
})




async function fetchAndSavePlayer(player) {
  try {
    const requests = player.map((id) =>
      axios.post(`http://164.30.71.107:3200/player`, {
        payload: { playerId: id },
        enums: false
      })
      .then(res => res.data) // nur die Daten extrahieren
      .catch(err => {
        console.error(`Fehler bei playerId ${id}:`, err.message)
        return null // Fehlerhafte Requests als null markieren
      })
    )
    let responses = await Promise.all(requests)
    responses = service.convertPlayer(responses)
    const skills = JSON.parse(fs.readFileSync("./data/SkillData.json", "utf8"))
    responses = service.expandSkills(responses, skills)
    console.log(
      `[${new Date().toLocaleTimeString()}] PlayerGuild-Daten gespeichert`,
    )
    return responses
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der PlayerGuild-Daten:`,
      err.message,
    )
  }
}

module.exports = router
