const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const digilockerRoutes = require('./routes/digilocker');
const { publicRouter: propertyRoutes, ownerRouter: ownerPropertyRoutes } = require('./routes/properties');

const app = express();
const allowedOrigins = new Set(config.frontendOrigins);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  }
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    error.status = 503;
    return next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/digilocker', digilockerRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/owner/properties', ownerPropertyRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: status >= 500 ? 'Internal server error.' : error.message
  });
});

module.exports = app;