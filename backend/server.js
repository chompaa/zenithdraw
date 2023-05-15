"use strict";
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        // origin: "http://localhost:3000",
        origin: "https://whiteboard-ykqq.onrender.com",
    }
});
const path = require('path');
const buildPath = path.join(__dirname, '..', 'frontend', 'whiteboard', 'build');
app.use(express.static(buildPath));
app.get('*', (req, res) => {
    res.sendFile('index.html', { buildPath });
});
io.on('connection', (socket) => {
    socket.on('draw-data', (data) => {
        socket.broadcast.emit('draw-data', data);
    });
});
server.listen(3001, () => {
    console.log("started on *:3001");
});
