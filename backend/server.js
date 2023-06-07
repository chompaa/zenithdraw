"use strict";
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});
const path = require("path");
const buildPath = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(buildPath));
app.get("*", (req, res) => {
  res.sendFile("index.html", { buildPath });
});
const users = new Set();
let host = "";
io.on("connection", (socket) => {
  const id = socket.id;
  console.log(id + " connected");
  users.add(id);
  if (host === "") {
    host = id;
  }
  socket.on("disconnect", (reason) => {
    console.log(id + " disconnected");
    users.delete(id);
    if (id === host) {
      host = users.values().next().value;
    }
  });
  socket.on("draw-data", (data) => {
    socket.broadcast.emit("draw-data", data);
  });
  socket.on("erase-data", (data) => {
    socket.broadcast.emit("erase-data", data);
  });
});
server.listen(3001, () => {
  console.log("started on *:3001");
});
