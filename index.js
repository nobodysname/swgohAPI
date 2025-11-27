// index.jsimport express from "express";
const express = require('express')
const api2 = require("./api2")
const api = require("./api")

const app = express();
const PORT = 3001;

// Router mounten
app.use(api2);

// Start server
app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});
