# --- Base Image ---
   FROM node:18-alpine AS base

   # Arbeitsordner setzen
   WORKDIR /app
   
   # Package-Dateien kopieren
   COPY package*.json ./
   
   # Dependencies installieren
   RUN npm ci --omit=dev
   
   # Restlichen Code kopieren
   COPY . .
   
   # Port öffnen
   EXPOSE 3000
   
   # Node im Production Mode
   ENV NODE_ENV=production
   
   # App starten
   CMD ["node", "index.js"]
   