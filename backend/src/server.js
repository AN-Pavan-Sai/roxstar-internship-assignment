const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const wheelRoutes = require('./routes/wheelRoutes');
const userRoutes = require('./routes/userRoutes');
const { handleSocketConnections } = require('./sockets/socketHandler');
const { setIoInstance } = require('./services/gameEngine');
const { setControllerIo } = require('./controllers/wheelController');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Inject socket.io instance into service modules
setIoInstance(io);
setControllerIo(io);

// Register API routes
app.use('/api/wheel', wheelRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

handleSocketConnections(io);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(3001, () => console.log('Game server online on Port 3001'));