const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const wheelRoutes = require('./routes/wheelRoutes');
const { handleSocketConnections } = require('./sockets/socketHandler');
const { setIoInstance } = require('./services/gameEngine');
const { setControllerIo } = require('./controllers/wheelController');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Inject standard dynamic Io elements into service models
setIoInstance(io);
setControllerIo(io);

// Establish endpoint configurations
app.use('/api/wheel', wheelRoutes);

handleSocketConnections(io);

server.listen(3001, () => console.log('Game server online on Port 3001'));