function handleSocketConnections(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_room', ({ wheelId }) => {
      socket.join(wheelId);
      console.log(`Socket ${socket.id} joined room ${wheelId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { handleSocketConnections };