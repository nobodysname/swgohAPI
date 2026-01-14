// api.js
const express = require("express");
const fs = require("fs");
const service = require("./service/service");
const { default: axios } = require("axios");
const strategyAuth = require("./strategyAuth");
const { db } = require("./db");

const router = express.Router();

router.post("/getGuild", async (req, res) => {
  try {
    if (fs.existsSync("./data/latestGuild.json")) {
      try {
        const file = fs.readFileSync("./data/latestGuild.json");
        const last = JSON.parse(file);
        if (last.name === req.body.name || !req.body.name) {
          res.send(last.data);
          return;
        }
      } catch (error) {
        console.error(
          "Fehler beim Lesen der fremnden Guilddatei:",
          err.message
        );
        res.status(500).json({
          error: "Fehler beim Lesen der fremnden Guilddatei: " + err.message,
        });
      }
    }
    console.log("ID: ", req.body);
    let response = await axios.post("http://164.30.71.107:3200/guild", {
      payload: {
        guildId: req.body.id,
        includeRecentGuildActivityInfo: true,
      },
      enums: false,
    });
    let convertedData = service.convertGuild(response.data);
    response = null;
    let guildmember = convertedData.guild.member.map((m) => m.playerId);
    convertedData = null;
    let player = await fetchAndSavePlayer(guildmember);
    guildmember = null;
    let data = JSON.parse(fs.readFileSync("./data/DataData.json"));
    let local = JSON.parse(fs.readFileSync("./data/Localization.json", "utf8"));
    const connectedData = service.connectData(player, data, local);
    player = null;
    data = null;
    local = null;
    let connected = service.connectUnits(connectedData);
    res.send(connected);
    const result = { name: req.body.name, data: connected };
    fs.writeFileSync(
      "./data/latestGuild.json",
      JSON.stringify(result, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Fehler beim Lesen der fremnden Guilde:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim Lesen der Guildnamen: " + err.message });
  }
});

router.post("/getGuildName", async (req, res) => {
  try {
    const response = await axios.post("http://164.30.71.107:3200/getGuilds", {
      payload: {
        filterType: 4,
        count: 10,
        name: req.body.name,
      },
      enums: false,
    });
    const filtered = service.filterGuildNames(response.data.guild);
    res.send(filtered);
  } catch (err) {
    console.error("Fehler beim Lesen der Guildennamen:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim Lesen der Guildnamen: " + err.message });
  }
});

router.get("/guilds", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/GuildData.json", "utf-8"));
    res.send(raw);
    console.log("GET /guilds 200");
  } catch (err) {
    console.error("Fehler beim Lesen der Guilddatei:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim Lesen der Guilddatei: " + err.message });
  }
});

router.get("/player", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/PlayerData.json", "utf-8"));
    res.send(raw);
    console.log("GET /player 200");
  } catch (err) {
    console.error("Fehler beim Lesen der Playerdatei:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim Lesen der Playerdatei: " + err.message });
  }
});

router.get("/data", async (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/DataData.json", "utf-8"));
    res.send(raw);
    console.log("GET /data 200");
  } catch (err) {
    console.error("Fehler beim Lesen der Datadatei:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim Lesen der Datadatei: " + err.message });
  }
});

router.get("/guildroster", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/TestData.json", "utf-8"));
    const wantedNames = [
      "Supreme Leader Kylo Ren",
      "Jedi Master Luke Skywalker",
      "Rey",
      "Ahsoka Tano",
      "Pirate King Hondo Ohnaka",
      "Sith Eternal Emperor",
      "Jedi Master Kenobi",
      "Jabba the Hutt",
      "Lord Vader",
      "Leia Organa",
      "Leviathan",
      "Executor",
      "Profundity",
      "Third Sister",
    ];
    let result = raw.filter((unit) => wantedNames.includes(unit.name));
    result = result.sort((a, b) => a.name.localeCompare(b.name));
    res.send(result);
    console.log("GET /guildroster");
  } catch (err) {
    console.error("Fehler beim berechnen des Guildroster:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim berechnen des Guildroster: " + err.message });
  }
});

router.get("/units", (req, res) => {
  try {
    let raw = JSON.parse(fs.readFileSync("./data/TestData.json", "utf-8"));
    raw = raw.sort((a, b) => a.name.localeCompare(b.name));
    res.send(raw);
    console.log("GET /units");
  } catch (err) {
    console.error("Fehler beim berechnen der Units:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim berechnen der Units: " + err.message });
  }
});

router.get("/unitNames", (req, res) => {
  try {
    let raw = JSON.parse(fs.readFileSync("./data/TestData.json", "utf-8"));
    raw = raw.map((unit) => {
      // Wir greifen auf das erste Member-Objekt zu (Index 0),
      // da der thumbnailName bei allen Membern dieser Unit gleich ist.
      // Wir nutzen Optional Chaining (?.) falls das Array mal leer sein sollte.
      const thumbnailName = unit.members?.[0]?.thumbnailName || null;

      return {
        name: unit.name,
        thumbnailName: thumbnailName,
      };
    });
    raw = raw.sort((a, b) => a.name.localeCompare(b.name));
    res.send(raw);
    console.log("GET /unitNames");
  } catch (err) {
    console.error("Fehler beim berechnen der UnitNames:", err.message);
    res
      .status(500)
      .json({ error: "Fehler beim berechnen der Units: " + err.message });
  }
});

router.get("/icons/:assetName", async (req, res) => {
  try {
    const assetName = req.params.assetName;

    const metadata = JSON.parse(
      fs.readFileSync("./data/Metadata.json", "utf-8")
    );

    const response = await axios({
      method: "get",
      url: "http://164.30.71.107:3001/Asset/list",
      params: {
        version: metadata.assetVersion,
        assetName: assetName,
      },
      responseType: "stream",
    });
    console.log(response);
    res.set("Content-Type", response.headers["content-type"]);

    response.data.pipe(res);

    console.log(`GET /icons/${assetName} - Success`);
  } catch (err) {
    console.error("Fehler beim Laden des Icons:", err.message);
    res.status(404).send("Icon not found");
  }
});
// A) ROUTE: Simulation ausführen (Admin Only, speichert JSON)
router.post("/tb/simulate", strategyAuth("admin"), async (req, res) => {
  try {
    // 1. Parameter aus dem Frontend empfangen
    const { guildGP, strikeZoneSuccessRates } = req.body;

    if (!guildGP || !strikeZoneSuccessRates) {
      return res.status(400).json({
        error: "Fehlende Parameter: guildGP oder strikeZoneSuccessRates",
      });
    }

    // 2. Daten einlesen (Wie gehabt)
    let raw = JSON.parse(fs.readFileSync("./data/TBData.json", "utf-8"));
    let text = JSON.parse(
      fs.readFileSync("./data/TBLocalization.json", "utf-8")
    );
    let opData = JSON.parse(fs.readFileSync("./opData/OpData.json", "utf-8"));
    const units = JSON.parse(fs.readFileSync("./data/TestData.json", "utf-8")); // Oder aus DB laden, falls vorhanden

    // 3. Service Logik
    let territoryMap = service.buildLocalizationMap(text);
    text = null;
    let planets = service.buildPlanets(
      raw.conflictZoneDefinition,
      raw.strikeZoneDefinition,
      raw.reconZoneDefinition
    );
    raw = null;
    planets = service.applyPlanetNames(planets, territoryMap);
    planets = service.attachOpUnitsToPlanets(planets, opData);
    territoryMap = null;

    // 4. Simulation starten (Mit Parametern aus req.body!)
    const finalPlan = service.simulateFullCampaign(
      units,
      Number(guildGP),
      planets,
      strikeZoneSuccessRates
    );

    finalPlan.simulationParams = {
      guildGP: guildGP,
      successRates: strikeZoneSuccessRates,
    };

    // 5. Ergebnis speichern
    fs.writeFileSync(
      "./data/LatestSimulation.json",
      JSON.stringify(finalPlan, null, 2)
    );

    console.log("POST /tb/simulate - Calculation saved.");
    res.json(finalPlan);
  } catch (err) {
    console.error("Fehler bei der TB Simulation:", err.message);
    res.status(500).json({ error: "Simulation failed: " + err.message });
  }
});

// B) ROUTE: Letztes Ergebnis abrufen (Public / Read-Only)
router.get("/tb/latest", async (req, res) => {
  try {
    const filePath = "./data/LatestSimulation.json";

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: "Keine Simulationsdaten vorhanden." });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(data);
  } catch (err) {
    console.error("Fehler beim Laden der TB Daten:", err.message);
    res.status(500).json({ error: "Laden fehlgeschlagen: " + err.message });
  }
});

router.post("/tb/auth", strategyAuth("admin"), (req, res) => {
  res.json({ success: true });
});

router.get("/strategy/:templateId", strategyAuth("viewer"), (req, res) => {
  const templateId = Number(req.params.templateId);

  const template = db
    .prepare(
      `
    SELECT * FROM strategy_templates WHERE id = ?
  `
    )
    .get(templateId);

  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }

  const zones = db
    .prepare(
      `
    SELECT z.id as zoneId, z.zone_key, r.*
    FROM strategy_zones z
    LEFT JOIN strategy_rows r ON r.zone_id = z.id
    WHERE z.template_id = ?
    ORDER BY z.zone_key, r.position
  `
    )
    .all(templateId);

  // Strukturieren
  const structured = {};
  for (const row of zones) {
    if (!structured[row.zone_key]) {
      structured[row.zone_key] = [];
    }

    if (row.id) {
      structured[row.zone_key].push({
        rowKey: row.row_key,
        team: row.team_name,
        amount: row.amount,
        note: row.note,
        position: row.position,
        rowId: row.id,
      });
    }
  }

  res.json({
    role: req.strategyRole,
    template,
    zones: structured,
  });
});

router.put("/strategy/row/:rowId", strategyAuth("admin"), (req, res) => {
  const rowId = Number(req.params.rowId);
  const { team, amount, note } = req.body;

  db.prepare(
    `
    UPDATE strategy_rows
    SET team_name = ?, amount = ?, note = ?
    WHERE id = ?
  `
  ).run(team ?? "", amount ?? "", note ?? "", rowId);

  console.log("PUT /Strategy/row");
  res.json({ success: true });
});

router.post("/strategy/template", strategyAuth("admin"), (req, res) => {
  const { name, description } = req.body;

  const result = db
    .prepare(
      `
    INSERT INTO strategy_templates (name, description)
    VALUES (?, ?)
  `
    )
    .run(name, description ?? "");

  res.json({ templateId: result.lastInsertRowid });
});

router.post("/strategy/row", strategyAuth("admin"), (req, res) => {
  const { zone, team, amount, note } = req.body;

  if (!zone) {
    return res.status(400).json({ error: "zone required" });
  }

  // Zone-ID holen
  const zoneRow = db
    .prepare(
      `
    SELECT id FROM strategy_zones WHERE zone_key = ?
  `
    )
    .get(zone);

  if (!zoneRow) {
    return res.status(404).json({ error: "Zone not found" });
  }

  // nächste Position bestimmen
  const maxPos = db
    .prepare(
      `
    SELECT COALESCE(MAX(position), -1) AS maxPos
    FROM strategy_rows
    WHERE zone_id = ?
  `
    )
    .get(zoneRow.id).maxPos;

  const result = db
    .prepare(
      `
    INSERT INTO strategy_rows (zone_id, row_key, team_name, amount, note, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      zoneRow.id,
      crypto.randomUUID(),
      team ?? "",
      amount ?? "",
      note ?? "",
      maxPos + 1
    );

  res.json({
    rowId: result.lastInsertRowid,
    team: team ?? "",
    amount: amount ?? "",
    note: note ?? "",
    position: maxPos + 1,
  });
});

router.delete("/strategy/row/:rowId", strategyAuth("admin"), (req, res) => {
  const rowId = Number(req.params.rowId);

  const result = db
    .prepare(
      `
    DELETE FROM strategy_rows
    WHERE id = ?
  `
    )
    .run(rowId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Row not found" });
  }

  res.json({ success: true });
});
// routes/counters.js (oder in server.js einfügen)

// 1. Alle Counter abrufen (Public / Viewer)
router.get("/counters", strategyAuth("viewer"), (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT * FROM counters ORDER BY created_at DESC
    `
      )
      .all();

    // Admin-Status zurückgeben, damit das Frontend weiß, ob Edit-Buttons angezeigt werden
    res.json({
      counters: rows,
      role: req.strategyRole, // 'admin' oder 'viewer'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Neuen Counter erstellen (Admin Only)
router.post("/counters", strategyAuth("admin"), (req, res) => {
  const {
    opponentLeaderId,
    counterTeam, // Array [leader, u2, u3, u4, u5]
    mode,
    description,
  } = req.body;

  if (!opponentLeaderId || !counterTeam || counterTeam.length < 1) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO counters (
        opponent_leader_id, 
        counter_leader_id, 
        unit_2_id, unit_3_id, unit_4_id, unit_5_id, 
        game_mode, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      opponentLeaderId,
      counterTeam[0], // Leader
      counterTeam[1] || "ANY",
      counterTeam[2] || "ANY",
      counterTeam[3] || "ANY",
      counterTeam[4] || "ANY",
      mode || "BOTH",
      description || ""
    );

    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Counter Löschen (Admin Only)
router.delete("/counters/:id", strategyAuth("admin"), (req, res) => {
  try {
    const stmt = db.prepare("DELETE FROM counters WHERE id = ?");
    const result = stmt.run(req.params.id);

    if (result.changes === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function fetchAndSavePlayer(player) {
  try {
    const requests = player.map((id) =>
      axios
        .post(`http://164.30.71.107:3200/player`, {
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
    console.log(
      `[${new Date().toLocaleTimeString()}] PlayerGuild-Daten gespeichert`
    );
    return responses;
  } catch (err) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Fehler beim Abrufen der PlayerGuild-Daten:`,
      err.message
    );
  }
}

module.exports = router;
