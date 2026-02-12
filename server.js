require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("DB ERROR:", err.message));

app.use("/api/auth", authRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("Device connected:", socket.id);

  socket.on("create-session", (pairCode) => {
    socket.join(pairCode);
    socket.emit("session-created", pairCode);
  });

  socket.on("join-session", (pairCode) => {
    socket.join(pairCode);
    io.to(pairCode).emit("user-connected");
  });

  socket.on("send-message", (data) => {
    io.to(data.pairCode).emit("receive-message", data);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
