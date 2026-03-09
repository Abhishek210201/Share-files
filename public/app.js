const socket = io();

// Unique ID for each device
const myId = Math.random().toString(36).substring(2, 9);
let currentPairCode = "";
let currentFile = null;
let typingTimeout = null;

// ============ UTILITY FUNCTIONS ============

function showPage(pageId) {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("pairPage").style.display = "none";
  document.getElementById("chatPage").style.display = "none";
  document.getElementById(pageId).style.display = "block";
}

// IMPROVED: Better status message display with longer timeout
function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-msg ${type}`;
  element.style.display = 'block';
  
  // FIXED: Longer display time - 10 seconds instead of 5
  setTimeout(() => {
    element.style.display = 'none';
  }, 10000);
}

function showLoading(show) {
  document.getElementById("loadingOverlay").style.display = show ? "flex" : "none";
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// ============ OTP AUTHENTICATION ============

async function sendOTP() {
  const phone = document.getElementById("phone").value.trim();

  if (!phone || phone.length < 10) {
    showStatus("loginStatus", "⚠️ Please enter a valid 10-digit phone number", "error");
    return;
  }

  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();

    if (data.otp) {
      // FIXED: Show OTP section immediately
      document.getElementById("otpSection").style.display = "block";
      
      // FIXED: Better OTP display with larger text and longer timeout
      showStatus("loginStatus", 
        `✅ OTP Sent Successfully!\n\n🔢 Your OTP: ${data.otp}\n\n⏰ Valid for 5 minutes`, 
        "success"
      );
      
      // FIXED: Auto-focus on OTP input
      setTimeout(() => {
        document.getElementById("otp").focus();
      }, 100);
      
    } else {
      showStatus("loginStatus", "❌ Failed to send OTP. Please try again.", "error");
    }
  } catch (error) {
    showStatus("loginStatus", "❌ Network error. Please check your connection.", "error");
  }
}

async function verifyOTP() {
  const phone = document.getElementById("phone").value.trim();
  const otp = document.getElementById("otp").value.trim();

  if (!otp || otp.length !== 6) {
    showStatus("loginStatus", "⚠️ Please enter the complete 6-digit OTP", "error");
    return;
  }

  const deviceId = "web-" + Math.random().toString(36).substring(2, 9);

  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        otp,
        deviceId,
        deviceName: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop"
      })
    });

    const data = await res.json();

    if (data.message.includes("successful")) {
      localStorage.setItem("userId", data.userId);
      showStatus("loginStatus", "✅ Login Successful! Redirecting...", "success");
      setTimeout(() => {
        showPage("pairPage");
      }, 1000);
    } else {
      showStatus("loginStatus", "❌ " + data.message, "error");
    }
  } catch (error) {
    showStatus("loginStatus", "❌ Verification failed. Please try again.", "error");
  }
}

// ============ SESSION MANAGEMENT ============

function createSession() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentPairCode = code;

  socket.emit("create-session", code);
  showPage("chatPage");
  updateStatus(`🟡 Waiting for connection... Code: ${code}`, "warning");
}

function joinSession() {
  const code = document.getElementById("pairInput").value.trim();

  if (!code || code.length !== 6) {
    showStatus("pairStatus", "⚠️ Please enter a valid 6-digit code", "error");
    return;
  }

  currentPairCode = code;
  socket.emit("join-session", code);
  showPage("chatPage");
  updateStatus("🟡 Connecting...", "warning");
}

function updateStatus(message, type) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  
  if (type === "success") {
    statusEl.style.color = "#34c759";
  } else if (type === "error") {
    statusEl.style.color = "#ff3b30";
  } else {
    statusEl.style.color = "#ff9500";
  }
}

function copyPairCode() {
  if (currentPairCode) {
    navigator.clipboard.writeText(currentPairCode);
    updateStatus(`✅ Code copied: ${currentPairCode}`, "success");
    setTimeout(() => {
      updateStatus("🟢 Connected", "success");
    }, 2000);
  }
}

function disconnect() {
  if (confirm("Are you sure you want to disconnect?")) {
    socket.disconnect();
    window.location.reload();
  }
}

// ============ FILE HANDLING ============

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    alert("❌ File size exceeds 50MB limit!");
    return;
  }

  currentFile = file;
  const preview = document.getElementById("filePreview");
  preview.style.display = "block";

  // Preview image files
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById("previewImage");
      img.src = e.target.result;
      img.style.display = "block";
      document.getElementById("previewFile").style.display = "none";
    };
    reader.readAsDataURL(file);
  } else {
    // Show file info for non-images
    document.getElementById("previewImage").style.display = "none";
    const fileInfo = document.getElementById("previewFile");
    fileInfo.style.display = "block";
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = formatFileSize(file.size);
  }
}

function cancelUpload() {
  currentFile = null;
  document.getElementById("filePreview").style.display = "none";
  document.getElementById("fileInput").value = "";
}

async function uploadFile() {
  if (!currentFile) return null;

  const formData = new FormData();
  formData.append("file", currentFile);

  showLoading(true);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    showLoading(false);

    if (data.success) {
      return data.file;
    } else {
      alert("❌ File upload failed!");
      return null;
    }
  } catch (error) {
    showLoading(false);
    alert("❌ Upload error: " + error.message);
    return null;
  }
}

// ============ MESSAGE SENDING ============

async function sendMessage() {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();

  // Send file if selected
  if (currentFile) {
    const fileData = await uploadFile();
    if (fileData) {
      socket.emit("send-message", {
        pairCode: currentPairCode,
        type: "file",
        file: fileData,
        sender: myId,
        caption: message
      });
      
      cancelUpload();
      messageInput.value = "";
    }
    return;
  }

  // Send text/link message
  if (!message) return;

  const messageData = {
    pairCode: currentPairCode,
    type: "text",
    message,
    sender: myId
  };

  // Detect if message is a link
  if (isValidURL(message)) {
    messageData.type = "link";
    messageData.url = message;
  }

  socket.emit("send-message", messageData);
  messageInput.value = "";
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

// ============ TYPING INDICATOR ============

function handleTyping() {
  const message = document.getElementById("message").value;
  
  if (message) {
    socket.emit("typing", { pairCode: currentPairCode, isTyping: true });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", { pairCode: currentPairCode, isTyping: false });
    }, 1000);
  } else {
    socket.emit("typing", { pairCode: currentPairCode, isTyping: false });
  }
}

// ============ CLIPBOARD SHARING ============

async function shareClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      socket.emit("share-clipboard", {
        pairCode: currentPairCode,
        content: text
      });
      addMessage("📋 Clipboard shared", "sent", "system");
    }
  } catch (error) {
    alert("❌ Unable to access clipboard. Please grant permission.");
  }
}

async function shareScreenshot() {
  alert("📸 Screenshot sharing coming soon! Use the file upload button (📎) to share images.");
}

// ============ MESSAGE DISPLAY ============

function addMessage(content, type, messageType = "text", fileData = null, url = null) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type);

  let html = "";

  if (messageType === "file" && fileData) {
    const isImage = fileData.mimetype.startsWith("image/");
    
    if (isImage) {
      html = `
        ${content ? `<div>${content}</div>` : ''}
        <img src="${fileData.path}" alt="${fileData.originalname}" onclick="window.open('${fileData.path}', '_blank')">
        <span class="message-time">${formatTime()}</span>
      `;
    } else {
      const icon = getFileIcon(fileData.mimetype);
      html = `
        ${content ? `<div>${content}</div>` : ''}
        <div class="file-msg">
          <span class="file-icon">${icon}</span>
          <div class="file-details">
            <span class="file-name">${fileData.originalname}</span>
            <span class="file-size">${formatFileSize(fileData.size)}</span>
          </div>
          <a href="${fileData.path}" download class="download-btn">Download</a>
        </div>
        <span class="message-time">${formatTime()}</span>
      `;
    }
  } else if (messageType === "link" && url) {
    html = `
      <div>${content}</div>
      <div class="link-preview">
        🔗 <a href="${url}" target="_blank">${url}</a>
      </div>
      <span class="message-time">${formatTime()}</span>
    `;
  } else {
    html = `
      <div>${content}</div>
      <span class="message-time">${formatTime()}</span>
    `;
  }

  msgDiv.innerHTML = html;

  const chatBox = document.getElementById("messages");
  
  // Remove welcome message if it exists
  const welcomeMsg = chatBox.querySelector(".welcome-msg");
  if (welcomeMsg) welcomeMsg.remove();
  
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function getFileIcon(mimetype) {
  if (mimetype.includes("pdf")) return "📄";
  if (mimetype.includes("video")) return "🎥";
  if (mimetype.includes("audio")) return "🎵";
  if (mimetype.includes("zip")) return "🗜️";
  if (mimetype.includes("word")) return "📝";
  return "📎";
}

// ============ SOCKET EVENT HANDLERS ============

socket.on("session-created", (pairCode) => {
  console.log("✅ Session created:", pairCode);
});

socket.on("user-connected", () => {
  updateStatus("🟢 Connected", "success");
  addMessage("✅ Device connected!", "system", "system");
});

socket.on("user-disconnected", () => {
  updateStatus("🔴 Disconnected", "error");
  addMessage("❌ Device disconnected", "system", "system");
});

socket.on("receive-message", (data) => {
  if (data.sender === myId) {
    // My own message - show on right
    if (data.type === "file") {
      addMessage(data.caption, "sent", "file", data.file);
    } else if (data.type === "link") {
      addMessage(data.message, "sent", "link", null, data.url);
    } else {
      addMessage(data.message, "sent", "text");
    }
  } else {
    // Other device's message - show on left
    if (data.type === "file") {
      addMessage(data.caption, "received", "file", data.file);
    } else if (data.type === "link") {
      addMessage(data.message, "received", "link", null, data.url);
    } else {
      addMessage(data.message, "received", "text");
    }
  }
});

socket.on("user-typing", (isTyping) => {
  const indicator = document.getElementById("typingIndicator");
  indicator.textContent = isTyping ? "typing..." : "";
  indicator.classList.toggle("typing-animation", isTyping);
});

socket.on("receive-clipboard", (content) => {
  navigator.clipboard.writeText(content);
  addMessage(`📋 Clipboard received: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`, "received", "system");
});

socket.on("error", (data) => {
  alert("❌ " + data.message);
  showPage("pairPage");
});

// ============ INITIALIZATION ============

// Check if user is already logged in
window.addEventListener("load", () => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    showPage("pairPage");
  }
});

// Handle browser back button
window.addEventListener("popstate", () => {
  window.location.reload();
});