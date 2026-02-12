const socket = io();

// 🔥 Unique ID for each device
const myId = Math.random().toString(36).substring(2, 9);

let currentPairCode = "";

// Page Switch Helper
function showPage(pageId) {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("pairPage").style.display = "none";
  document.getElementById("chatPage").style.display = "none";
  document.getElementById(pageId).style.display = "block";
}

// ================= OTP =================

async function sendOTP() {
  const phone = document.getElementById("phone").value;

  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });

  const data = await res.json();

  alert("Your OTP is: " + data.otp);
}


async function verifyOTP() {
  const phone = document.getElementById("phone").value;
  const otp = document.getElementById("otp").value;

  const deviceId = "web-" + Math.random().toString(36).substring(2, 9);

  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      otp,
      deviceId,
      deviceName: "Web"
    })
  });

  const data = await res.json();

  if (data.message.includes("successful")) {
    showPage("pairPage");
  } else {
    alert(data.message);
  }
}

// ================= Pair =================

function createSession() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentPairCode = code;

  socket.emit("create-session", code);

  showPage("chatPage");

  document.getElementById("status").innerText =
    "Session Code: " + code + " (Waiting...)";
}

function joinSession() {
  const code = document.getElementById("pairInput").value;
  currentPairCode = code;

  socket.emit("join-session", code);

  showPage("chatPage");
}

// When second device connects
socket.on("user-connected", () => {
  document.getElementById("status").innerText = "Connected ✅";
});

// ================= Chat =================

function sendMessage() {
  const message = document.getElementById("message").value;
  if (!message) return;

  // 🔥 Send to server with sender ID
  socket.emit("send-message", {
    pairCode: currentPairCode,
    message,
    sender: myId
  });

  document.getElementById("message").value = "";
}

// Receive message from server
socket.on("receive-message", (data) => {

  if (data.sender === myId) {
    // If message is mine → right side
    addMessage(data.message, "sent");
  } else {
    // Other device → left side
    addMessage(data.message, "received");
  }

});

// Add message to UI
function addMessage(text, type) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type);
  msgDiv.innerText = text;

  const chatBox = document.getElementById("messages");
  chatBox.appendChild(msgDiv);

  // Auto scroll
  chatBox.scrollTop = chatBox.scrollHeight;
}
