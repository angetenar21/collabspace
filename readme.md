# CollabSpace

A modern, real-time collaborative document editor designed for a professional, distraction-free writing experience.

## Features

- **Real-Time Collaboration:** Edit documents simultaneously with your team, powered by WebSockets.
- **Advanced Permissions:** Google Docs-style sharing. Assign specific roles (Viewer or Editor) to manage document security.
- **Access Requests & Approvals:** Users can request access via a shared link. Note owners get an instant dashboard notification to approve or deny the request.
- **Deep Linking:** Send a direct link to any workspace. CollabSpace handles authentication and redirects you right back into the document.
- **Live User Presence:** See exactly who is online and currently viewing the document with you.
- **Modern UI:** A clean, minimal, SaaS-tier aesthetic utilizing `lucide-react` for crisp icons.

## Tech Stack

- **Frontend:** React.js, React Router, Vanilla CSS
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB
- **Security:** JSON Web Tokens (JWT) & bcrypt

## Getting Started (Local Development)

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file in the `backend` folder (you can use `.env.example` as a template). Ensure you provide a valid `MONGO_URI` and a secure `JWT_SECRET`.
4. Start the server:
   ```bash
   npm run start
   ```
   *The backend will run on `http://localhost:5001`.*

### 2. Frontend Setup

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React application:
   ```bash
   npm run start
   ```
   *The frontend will automatically open at `http://localhost:3000`.*
