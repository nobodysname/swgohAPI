// api.js
const express = require("express")
const fs = require("fs");
const service = require("./service/service");


const router = express.Router();

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
    const wantedNames = ["Supreme Leader Kylo Ren", "Jedi Master Luke Skywalker", "Rey", "Ahsoka Tano", "Pirate King Hondo Ohnaka", "Sith Eternal Emperor", "Jedi Master Kenobi", "Jabba the Hutt", "Lord Vader", "Leia Organa", "Leviathan", "Executor", "Profundity"]
    const result = raw.filter(unit =>
      wantedNames.includes(unit.name)
    );
    res.send(result)
    console.log("GET /guildroster")
  } catch (err) {
    console.error("Fehler beim berechnen des Guildroster:", err.message);
    res.status(500).json({ error: "Fehler beim berechnen des Guildroster: "+ err.message });
  }
})

router.get("/units", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/TestData.json", 'utf-8'))
    res.send(raw)
    console.log("GET /units")
  } catch (err) {
    console.error("Fehler beim berechnen der Units:", err.message);
    res.status(500).json({ error: "Fehler beim berechnen der Units: "+ err.message });
  }
})

module.exports = router
