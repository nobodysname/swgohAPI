// index.jsimport express from "express";
const express = require('express')
const api2 = require("./api2")
const api = require("./api")
//const gameData = require("./gameData")
const compression = require('compression')
const cors = require('cors')



const app = express();
const PORT = 3000;

const allowedOrigins = ['http://164.30.71.107:8080']; // Hinzufügen der tatsächlichen Frontend-Origin(s)

const corsOptions = {
  origin: (origin, callback) => {
    // Erlaube Anfragen ohne Origin (wie native Apps, curl oder same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Nicht durch CORS erlaubt'));
    }
  },
  optionsSuccessStatus: 200 // Für ältere Browser/Clients
}

// Statt app.use(cors())
app.use(cors(corsOptions))

app.use(compression())

// Router mounten
app.use(api2);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend läuft auf http://0.0.0.0:${PORT}`);
});

