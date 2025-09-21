# Daily Coding Challenge (Full Stack)

This project contains a frontend (vanilla HTML/JS) and a Node/Express backend with MongoDB for users, questions, quizzes, and attempts.

## Project Structure

```
IWP_PROJECT/
├─ frontend/
│  ├─ index.html
│  ├─ admin.html
│  ├─ faculty.html
│  ├─ student.html
│  ├─ *.js, *.css, assets
│
├─ backend/
│  ├─ server.js
│  ├─ routes/
│  ├─ models/
│  ├─ middleware/
│  ├─ .env               # not committed (use .env.example)
│  ├─ package.json
│
├─ .gitignore
├─ README.md
```

## Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)

## Backend: Environment Variables
Create `backend/.env` with these two keys (no quotes, single line for URI):

```
MONGO_URI=<your mongodb connection string>
JWT_SECRET=<your jwt secret>
```

Examples:

- Atlas SRV (requires DNS that supports SRV/TXT):
```
MONGO_URI=mongodb+srv://<user>:<URL_ENCODED_PWD>@cluster0.xxxxx.mongodb.net/Daily_coding_challenge?retryWrites=true&w=majority
```

- Atlas Standard (non‑SRV, avoids SRV DNS):
```
MONGO_URI=mongodb://<user>:<URL_ENCODED_PWD>@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/Daily_coding_challenge?ssl=true&replicaSet=<yourReplicaSet>&authSource=admin
```

- Local MongoDB:
```
MONGO_URI=mongodb://127.0.0.1:27017/Daily_coding_challenge
```

## Install & Run (Backend)

From `backend/`:

```
npm install
node server.js
```

Expected output:
- `✅ MongoDB Connected: ...`
- `🚀 Server running at http://localhost:5000`

## Run (Frontend)
Serve the `frontend/` folder as static files (e.g., VS Code Live Server) and open `frontend/index.html`.

- Login via `/auth/login`. The frontend stores a JWT and sends it in the `Authorization: Bearer <token>` header.
- Admin can:
  - Add questions (POST `/questions`)
  - Add users with class (POST `/admin/users`)
  - Schedule quizzes by class (POST `/quizzes`)
- Students see today’s quiz (GET `/student/quizzes`) and submit (POST `/student/attempt`).
- Faculty can view students of their class (GET `/faculty/students`).

## Deploying

- Backend:
  - Render/Railway/Fly.io → create a Web Service.
  - Set `MONGO_URI` and `JWT_SECRET` in the service’s environment variables.
  - Start command: `node backend/server.js`.

- Frontend:
  - Netlify/Vercel/Cloudflare Pages → deploy the `frontend/` directory.
  - If backend is on a different origin, ensure CORS is enabled on the backend (already added) and the frontend uses the correct absolute URLs.

## Troubleshooting

- SRV DNS issues with `mongodb+srv://`:
  - Use the Standard/non‑SRV connection string from Atlas (starts with `mongodb://`) OR change your DNS to public (8.8.8.8 / 1.1.1.1).
- 401 Unauthorized from frontend:
  - Re‑login so the JWT is stored; the frontend attaches it automatically.
- Collections missing:
  - MongoDB creates them on the first insert. Use Admin dashboard to add data.

## Security
- Do not commit `backend/.env`. Use `backend/.env.example` for guidance.
- Keep `JWT_SECRET` private; rotate in production.
