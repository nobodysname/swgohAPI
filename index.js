// index.jsimport express from "express";
const express = require('express')
const api2 = require("./api2")
const api = require("./api")
//const gameData = require("./gameData")
const compression = require('compression')

const app = express();
const PORT = 3000;

app.use(compression())

// Router mounten
app.use(api2);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend läuft auf http://0.0.0.0:${PORT}`);
});

