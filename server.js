require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");

const app = express();

// Security & Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for Socket.io
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Serve static files
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|mp4|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, docs, and videos allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: fileFilter
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.log("❌ DB ERROR:", err.message);
    process.exit(1);
  });

// Routes
app.use("/api/auth", authRoutes);

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

// HTTP Server
const server = http.createServer(app);

// Socket.IO Configuration
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});

// Store active sessions
const sessions = new Map();

io.on("connection", (socket) => {
  console.log("🔗 Device connected:", socket.id);

  // Create new session
  socket.on("create-session", (pairCode) => {
    socket.join(pairCode);
    
    if (!sessions.has(pairCode)) {
      sessions.set(pairCode, {
        devices: [socket.id],
        createdAt: new Date()
      });
    }
    
    socket.emit("session-created", pairCode);
    console.log(`📱 Session created: ${pairCode}`);
  });

  // Join existing session
  socket.on("join-session", (pairCode) => {
    const room = io.sockets.adapter.rooms.get(pairCode);
    
    if (!room) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    if (room.size >= 2) {
      socket.emit("error", { message: "Session is full" });
      return;
    }

    socket.join(pairCode);
    
    if (sessions.has(pairCode)) {
      sessions.get(pairCode).devices.push(socket.id);
    }
    
    io.to(pairCode).emit("user-connected");
    console.log(`✅ Device joined session: ${pairCode}`);
  });

  // Send message (text, link, or file)
  socket.on("send-message", (data) => {
    io.to(data.pairCode).emit("receive-message", {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  // Typing indicator
  socket.on("typing", (data) => {
    socket.to(data.pairCode).emit("user-typing", data.isTyping);
  });

  // Clipboard share
  socket.on("share-clipboard", (data) => {
    socket.to(data.pairCode).emit("receive-clipboard", data.content);
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    console.log("❌ Device disconnected:", socket.id);
    
    // Remove from sessions
    for (let [pairCode, session] of sessions.entries()) {
      const index = session.devices.indexOf(socket.id);
      if (index > -1) {
        session.devices.splice(index, 1);
        io.to(pairCode).emit("user-disconnected");
        
        // Clean up empty sessions
        if (session.devices.length === 0) {
          sessions.delete(pairCode);
        }
      }
    }
  });
});

// Clean up old sessions every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (let [pairCode, session] of sessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      sessions.delete(pairCode);
      console.log(`🧹 Cleaned up old session: ${pairCode}`);
    }
  }
}, 60 * 60 * 1000);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
