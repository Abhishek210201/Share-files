# Device Sync Pro

A real-time file and message sharing application between devices using phone number authentication.

## Features

- 📱 Phone number OTP authentication
- 🔄 Real-time messaging and file sharing
- 📎 Support for images, PDFs, documents, and videos
- 📋 Clipboard sharing
- 🔗 Link sharing
- 📸 Screenshot sharing (coming soon)
- 🛡️ Secure with rate limiting and helmet

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:5000`

## Environment Variables

- `MONGO_URI`: MongoDB connection string (required)
- `PORT`: Server port (optional, defaults to 5000)

## Technologies Used

- Node.js
- Express.js
- Socket.io
- MongoDB with Mongoose
- Multer for file uploads
- Helmet for security
- Express Rate Limit

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/devices/:userId` - Get user's devices

### File Upload
- `POST /api/upload` - Upload files

## License

ISC