const express = require('express')
const api = require('./api')
const api2 = require("./api2")
const compression = require('compression')
const cors = require('cors')
const fs = require('fs')
const bcrypt = require('bcrypt')

const ZONES = ['F1','F2','T1','T2','T3','T4','B1','B2','B3','B4']
const ROW_KEYS = ['TOP_ROW_1','TOP_ROW_2','BOT_ROW_1','BOT_ROW_2']

require('dotenv').config();

const { db } = require('./db')

function bootstrapStrategy({
  viewerPassword,
  adminPassword
}) {
  const existing = db.prepare(
    'SELECT id FROM strategy_settings WHERE id = 1'
  ).get()

  if (existing) {
    console.log("exisiting")
    return
  }

  const viewerHash = bcrypt.hashSync(viewerPassword, 10)
  const adminHash = bcrypt.hashSync(adminPassword, 10)

  // Settings
  db.prepare(`
    INSERT INTO strategy_settings (id, viewer_hash, admin_hash)
    VALUES (1, ?, ?)
  `).run(viewerHash, adminHash)

  // Default Template
  const template = db.prepare(`
    INSERT INTO strategy_templates (name, description)
    VALUES (?, ?)
  `).run('Default TW', 'Standard Territory War Setup')

  const templateId = template.lastInsertRowid

  // Zonen + Reihen
  const insertZone = db.prepare(`
    INSERT INTO strategy_zones (template_id, zone_key)
    VALUES (?, ?)
  `)

  const insertRow = db.prepare(`
    INSERT INTO strategy_rows
    (zone_id, row_key, team_name, amount, note, position)
    VALUES (?, ?, '', '', '', ?)
  `)

  for (const zone of ZONES) {
    const zoneRes = insertZone.run(templateId, zone)
    const zoneId = zoneRes.lastInsertRowid

    ROW_KEYS.forEach((rowKey, idx) => {
      insertRow.run(zoneId, rowKey, idx)
    })
  }

  console.log('✅ Strategy DB bootstrapped')
}

bootstrapStrategy({
  viewerPassword: process.env.VIEW_PASSWORD,
  adminPassword: process.env.ADMIN_PASSWORD
})


const app = express();
app.use(express.json())
const PORT = 3000;

const corsOptions = {
  origin: '*',
  optionSuccessStatus: 200,
  methods: ["GET", "PUT", "POST", "DELETE", "PATCH"]
};

console.log(process.env.NODE_ENV)

const certPath = '/etc/ssl/ginwalkers'

let options
try {
  options = {
    key: fs.readFileSync(`${certPath}/privkey.pem`),
    cert: fs.readFileSync(`${certPath}/fullchain.pem`),
  }
  console.log('SSL Certificates loaded')
} catch (err) {
  console.error('Could not load SSL certificates:', err)
  options = null
}

let server
if (options) {
  const https = require('https')
  server = https.createServer(options, app)
} else {
  const http = require('http')
  server = http.createServer(app)
}

app.use(cors(corsOptions));
app.use(compression());
app.use(api2);



server.listen(PORT, () => {
  console.log("Server running on", PORT)
})