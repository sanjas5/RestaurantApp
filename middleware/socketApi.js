var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

io.on('connection', function (socket) {
  console.log('A user connected');

  socket.on('chat message', ({ msg, role }) => {
    // console.log('message: ' + msg);
    socket.broadcast.emit(
      role === 'Admin' ? 'chat message admin' : 'chat message',
      msg
    );
  });

  socket.on('delivery done', (msg) => {
    socket.broadcast.emit('delivery pending', msg);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

module.exports = socketApi;
