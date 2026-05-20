function handleSocketConnections(io) {
    io.on('connection', (socket) => {
      socket.on('join_room', ({ wheelId }) => {
        socket.join(wheelId);
      });
    });
  }
  
  module.exports = { handleSocketConnections };