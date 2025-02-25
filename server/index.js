const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (ngrok requires this for testing)
    methods: ['GET', 'POST'],
  },
});

// Integrate PeerJS server into Express
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs', // Match the path used in App.js
});
app.use('/peerjs', peerServer);

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb+srv://karan0102:Gautamn49@mernapp.cyecl.mongodb.net/WebChatApplication', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('offer', (offer, targetId) => {
      console.log(`Offer from ${socket.id} to ${targetId}`);
      socket.to(targetId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, targetId) => {
      console.log(`Answer from ${socket.id} to ${targetId}`);
      socket.to(targetId).emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate, targetId) => {
      console.log(`ICE candidate from ${socket.id} to ${targetId}`);
      socket.to(targetId).emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

server.listen(5000, () => {
  console.log('Server running on port 5000');
});