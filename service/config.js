/**
 * Auto-detect environment:
 * - production: läuft im Docker / Server
 * - development: läuft lokal
 */

const isProd = process.env.NODE_ENV === 'production';

// Dynamische Base URL für comlink
const COMLINK_BASE = isProd
  ? 'http://swgoh-comlink:3000'        // Docker-intern
  : 'http://164.30.71.107:3200';       // Lokal erreichbar

module.exports = {
  COMLINK_BASE
};
