const express = require('express');
const socket = require('socket.io');

const PORT = process.env.PORT || 4000;

const app = express();
const server = app.listen(PORT, '0.0.0.0', function () {
  console.log('Servidor corriendo en http://0.0.0.0:' + PORT);
});

// Servir archivos estáticos desde la misma carpeta del proyecto
app.use(express.static(__dirname));

// maxHttpBufferSize: permite enviar archivos de hasta 25 MB
const io = socket(server, { maxHttpBufferSize: 25 * 1024 * 1024 });

io.on('connection', function (socket) {
  console.log('Hay una conexion', socket.id);

  // Mensaje de texto -> a todos los clientes
  socket.on('chat', function (data) {
    console.log(data);
    io.sockets.emit('chat', data);
  });

  // Archivo adjunto (foto, video, documento...) -> a todos los clientes
  socket.on('archivo', function (data) {
    console.log('Archivo de', data.usuario, ':', data.nombre, data.tipo);
    io.sockets.emit('archivo', data);
  });

  // Notificación "está escribiendo" -> a todos menos al emisor
  socket.on('typing', function (data) {
    socket.broadcast.emit('typing', data);
  });
});
