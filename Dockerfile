   FROM node:18-alpine AS base
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --omit=dev
   COPY . .
   EXPOSE 3000
   ENV NODE_ENV=production
   CMD ["node", "index.js"]
   