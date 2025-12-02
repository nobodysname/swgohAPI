// index.jsimport express from "express";
const express = require('express')
const api2 = require("./api2")
const api = require("./api")
const gameData = require("./gameData")
const compression = require('compression')

const app = express();
const PORT = 3001;

app.use(compression())

// Router mounten
app.use(api2);

// Start server
app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});
