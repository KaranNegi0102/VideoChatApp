const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Video chat server running');
});

let connectedUsers = [];

io.on('connection', (socket) => {
  const user = { id: socket.id };
  connectedUsers.push(user);
  console.log('User connected:', socket.id);
  console.log('Current users:', connectedUsers.map((u) => u.id)); // Debug log
  io.emit('user-list', connectedUsers.map((u) => u.id));

  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  socket.on('disconnect', () => {
    connectedUsers = connectedUsers.filter((u) => u.id !== socket.id);
    console.log('User disconnected:', socket.id);
    console.log('Current users:', connectedUsers.map((u) => u.id)); // Debug log
    io.emit('user-list', connectedUsers.map((u) => u.id));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});