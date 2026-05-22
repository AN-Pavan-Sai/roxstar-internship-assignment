# Roxstar Arena — Spin Wheel Game

A real-time multiplayer spin wheel elimination game built as a full-stack web application. An admin creates game rooms, players join by paying an entry fee, and the wheel eliminates participants one by one until a single winner claims the prize pool.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 8, Socket.IO Client |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Database** | PostgreSQL |
| **ORM** | Prisma 6 |

## Features

- **User Registration & Login** — Simple username-based authentication with 1,000 starting coins
- **Admin Panel** — Admins can create game rooms and force-start games
- **Real-Time Multiplayer** — WebSocket-powered live updates for all connected players
- **Spin Wheel Visualization** — SVG-based animated wheel with dynamic player segments
- **Elimination System** — Players eliminated every 7 seconds until one winner remains
- **Coin Economy** — Entry fees collected and split: 70% winner, 20% admin, 10% platform
- **Auto-Start / Abort** — Games auto-start after 3 minutes (min 3 players) or abort with refunds
- **Game History** — View past completed and aborted games
- **Session Persistence** — User sessions saved in localStorage
- **Premium Dark UI** — Glassmorphism, ambient animations, responsive design

## Project Structure

```
roxstar-internship-assignment/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (User, SpinWheel, Participant, Transaction)
│   │   └── seed.js                # Seeds SystemConfig and admin user
│   ├── src/
│   │   ├── config/
│   │   │   ├── prisma.js          # Prisma client instance
│   │   │   └── gameConfig.js      # Fetches game config from DB (entry fee, pool splits)
│   │   ├── controllers/
│   │   │   ├── userController.js  # Register, login, profile, list users
│   │   │   └── wheelController.js # Initialize, join, start, status, history
│   │   ├── routes/
│   │   │   ├── userRoutes.js      # /api/users/* routes
│   │   │   └── wheelRoutes.js     # /api/wheel/* routes
│   │   ├── services/
│   │   │   └── gameEngine.js      # Core game logic (countdown, elimination, payout)
│   │   ├── sockets/
│   │   │   └── socketHandler.js   # WebSocket connection handling
│   │   └── server.js              # Express + Socket.IO server entry point
│   ├── .env                       # DATABASE_URL
│   └── package.json
├── frontend/
│   └── assignment/
│       ├── src/
│       │   ├── components/
│       │   │   ├── LoginScreen.jsx      # Login/register screen
│       │   │   ├── SpinWheelGame.jsx    # Main game component
│       │   │   ├── SpinWheelVisual.jsx  # SVG spin wheel visualization
│       │   │   └── ParticipantList.jsx  # Player list with status indicators
│       │   ├── App.jsx                  # Root app with session management
│       │   ├── main.jsx                 # React entry point
│       │   └── index.css                # Complete design system (800+ lines)
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
└── README.md
```

## API Endpoints

### Users
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/users/register` | Create new user (gets 1,000 coins) |
| POST | `/api/users/login` | Login by username |
| GET | `/api/users/all` | List all users |
| GET | `/api/users/:id` | Get user profile with transactions |

### Spin Wheel
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/wheel/initialize` | Admin creates a new game room |
| POST | `/api/wheel/join` | User pays entry fee and joins |
| POST | `/api/wheel/start` | Admin force-starts the game |
| GET | `/api/wheel/active` | Get current active/initialized wheel |
| GET | `/api/wheel/status/:id` | Get wheel details with participants |
| GET | `/api/wheel/history` | Get past completed/aborted games |
| GET | `/api/health` | Health check |

### WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join a wheel's socket room |
| `wheel_created` | Server → All | New game room available |
| `user_joined` | Server → Room | Player joined with updated pool |
| `game_started` | Server → Room | Wheel started spinning |
| `user_eliminated` | Server → Room | Player eliminated |
| `game_over` | Server → Room | Winner determined |
| `game_aborted` | Server → Room | Game aborted, coins refunded |

## Database Schema

- **User** — id, username, role (USER/ADMIN), coins
- **SystemConfig** — key-value pairs for game settings (entry fee, pool percentages)
- **SpinWheel** — id, status, entryFee, winnerPool, adminPool, appPool, winnerId
- **Participant** — links users to spin wheels, tracks elimination status
- **Transaction** — coin transaction ledger (ENTRY_FEE, WINNINGS, ADMIN_REWARD, REFUND)

## Game Flow

1. Admin logs in and clicks **Create Game Room**
2. Players register/login, see the active game, and click **Pay & Join**
3. Entry fee (default 50 coins) is deducted and split into pools (70/20/10)
4. After 3 minutes (auto) or admin force-start (min 3 players), the wheel spins
5. One player is eliminated every 7 seconds
6. Last player standing wins the winner pool (70% of total fees)
7. Admin receives the admin pool (20%), platform keeps 10%
8. If fewer than 3 players join within 3 minutes, game aborts and coins are refunded

## Setup & Run Locally

### Prerequisites
- Node.js 18+
- PostgreSQL running on localhost:5432

### Backend
```bash
cd backend
npm install
```

Create a `.env` file:
```
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/roxstar_db?schema=public"
```

Push schema and seed:
```bash
npx prisma db push
npx prisma db seed
npm start
```

Backend runs on **http://localhost:3001**

### Frontend
```bash
cd frontend/assignment
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### Default Credentials

The database seed creates one admin account:

| Role | Username | Password | Starting Coins |
|------|----------|----------|----------------|
| Admin | `admin_star` | *(none — username only)* | 5,000 |

Sign in with username **admin_star** to access admin features (create game rooms, force-start games). Regular users can create their own accounts via the "Create Account" tab.

## Changes Made

### Backend Bug Fixes
- **gameConfig.js** — Fixed broken `Config.findMany()` → `prisma.systemConfig.findMany()` with proper variable assignment
- **package.json** — Added missing `dotenv` dependency and `start` script

### Backend New Features
- **userController.js** — New file: register, login, profile, list all users
- **userRoutes.js** — New file: `/api/users/*` routes
- **wheelController.js** — Added `getWheelStatus`, `getActiveWheel`, `getHistory` endpoints; duplicate join prevention; full participant data broadcast on join
- **wheelRoutes.js** — Added GET routes for active wheel, history, and status
- **server.js** — Registered user routes, added health check endpoint, global error handler
- **socketHandler.js** — Added connection/disconnect logging

### Frontend Complete Redesign
- **index.html** — Added Google Fonts (Inter, Outfit), meta description, proper title
- **index.css** — 800+ lines: premium dark theme, glassmorphism, ambient animations, responsive layout, micro-interactions
- **App.jsx** — Session management with localStorage, login/logout flow, header with user info and coin balance
- **LoginScreen.jsx** — New file: animated login/register card with tabs
- **SpinWheelGame.jsx** — Complete rewrite: real-time game UI, admin controls, join flow, countdown timer, prize pool breakdown, game over overlay, event ticker, game history
- **SpinWheelVisual.jsx** — New file: SVG-based animated spin wheel with dynamic segments
- **ParticipantList.jsx** — New file: player list with status badges, elimination effects, winner highlight
- **App.css** — Deleted (consolidated into index.css)

## Deployment

| Component | Service | URL |
|-----------|---------|-----|
| Database | Neon | PostgreSQL cloud |
| Backend | Render | `https://roxstar-backend.onrender.com` |
| Frontend | Vercel | Deploy from `frontend/assignment` |