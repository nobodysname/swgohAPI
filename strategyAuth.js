// middleware/strategyAuth.js
const { verifyStrategyPassword } = require('./db') // Pfad ggf. anpassen

/**
 * Erwartet:
 *  - Header: x-strategy-password
 * Setzt:
 *  - req.strategyRole = 'viewer' | 'admin'
 */
function strategyAuth(requiredRole = 'viewer') {
  return (req, res, next) => {
    const password = req.headers['x-strategy-password']

    if (!password) {
      return res.status(401).json({ error: 'Strategy password required' })
    }

    const role = verifyStrategyPassword(password)

    if (!role) {
      return res.status(403).json({ error: 'Invalid strategy password' })
    }

    if (requiredRole === 'admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Admin password required' })
    }

    req.strategyRole = role
    next()
  }
}


module.exports = strategyAuth
