# Neurovia

Neurovia is a medical education platform for learning, teaching, and day-to-day clinical study. Students work through programs, courses, quizzes, flashcards, and clinical cases. Educators publish that content. Administrators manage users, billing, and the medical reference library. Clinicians can use the built-in doctor tools.

The repository ships without demo accounts or sample clinical content. You create the first users and all course material yourself.

## Intended users

- **Students** learn from courses, lessons, quizzes, flashcards, clinical cases, and structured programs, and can message support from the student portal.
- **Educators** author courses, lessons, quizzes, flashcards, clinical cases, and programs at `/educator`.
- **Administrators** manage users, content, subscriptions, payments, notifications, and reference data at `/admin`.
- **Clinicians** use doctor tools, medical reference data (diseases, medications, symptoms), and clinical cases.

## Technologies

| Area | Stack |
| --- | --- |
| Frontend | React 18, Vite, React Router, Chakra UI, Tailwind CSS, Redux Toolkit, TanStack Query, Socket.IO client, i18next |
| Backend | Node.js, Express, MongoDB with Mongoose, JWT, Socket.IO, Winston |
| Optional integrations | Stripe, PayPal, Google sign-in, SMTP email |

## Project layout

- `frontend/` — student app, plus the admin and educator portals in the same Vite app
- `backend/` — REST API and realtime messaging
- `backend/.env.example` and `frontend/.env.example` — configuration templates with no real credentials

## Setup

You need Node.js 18 or newer and a MongoDB database (local or Atlas).

### Backend

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env`.

Edit `backend/.env` and set at least:

- `MONGODB_URI` — your database. The example uses `mongodb://127.0.0.1:27017/neurovia_db`.
- `JWT_SECRET` — a long random string. Do not reuse the placeholder.

Then start the API:

```bash
npm run dev
```

The API listens on port `5000`.

### Frontend

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env`, then start the app:

```bash
npm run dev
```

Open `http://localhost:5173`.

- Student app: `/`
- Admin portal: `/admin`
- Educator portal: `/educator`

Register the first account from `/register`. The database starts empty.

### Checks

```bash
cd backend && npm test
cd frontend && npm test
```

## Configuration

Copy the example env files and keep the real `.env` files on your machine. They are gitignored.

| Variable | Where | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | backend | MongoDB connection string |
| `JWT_SECRET` | backend | Signs authentication tokens |
| `PORT` | backend | API port, default `5000` |
| `ALLOWED_ORIGINS` | backend | Browser origins allowed to call the API |
| `EMAIL_*` | backend | Optional password-reset mail |
| `VITE_API_BASE_URL` | frontend | API origin, default `http://localhost:5000` |
| `VITE_STRIPE_PUBLIC_KEY` | frontend | Optional Stripe publishable key |
| `VITE_GOOGLE_CLIENT_ID` | frontend | Optional Google sign-in client id |

Never commit API keys, database passwords, JWT secrets, or private keys.

## License

MIT. See [LICENSE](LICENSE).
