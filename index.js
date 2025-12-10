const express = require('express')
const api = require('./api')
const api2 = require("./api2")
const compression = require('compression')
const cors = require('cors')
const fs = require('fs')

require('dotenv').config();

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