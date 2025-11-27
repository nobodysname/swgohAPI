// api.js
const express = require("express")
const fs = require("fs");
const service = require("./service/service")

const router = express.Router();

router.get("/guilds", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/GuildData.json", 'utf-8'));
    const temp = service.convertGuild(raw)
    res.send(temp)
    console.log("GET /guilds 200")
  } catch (err) {
    console.error("Fehler beim Lesen der Guilddatei:", err.message);
    res.status(500).json({ error: "Fehler beim Lesen der Guilddatei: "+ err.message });
  }
});

router.get("/player", (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync("./data/PlayerData.json", 'utf-8'));
    const temp = service.convertPlayer(raw)
    res.send(temp)
    console.log("GET /player 200")
  } catch (error) {
    console.error("Fehler beim Lesen der Playerdatei:", err.message);
    res.status(500).json({ error: "Fehler beim Lesen der Playerdatei: "+ err.message });
  }
})

module.exports = router
