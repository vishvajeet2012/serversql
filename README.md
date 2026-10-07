# TestMarks API

REST API for **TestMarks**, a school test and marks management system. It handles authentication, role-based access for admins, teachers and students, classes and sections, tests, marks approval, rankings, analytics, feedback and push notifications.

The mobile client is [vishvajeet2012/Testmarks-Native](https://github.com/vishvajeet2012/Testmarks-Native).

## Features

- **Auth:** register, login and `/me` with JWT, hashed passwords, and push-token registration
- **Admin:** manage users, classes, sections and subjects, assign teachers to sections, platform totals and analytics, audit logs
- **Marks workflow:** teachers enter marks, admins approve, reject or bulk-approve them
- **Teacher views:** per-test details, mark distribution, their own tests, a student's record in a class and section
- **Student views:** dashboard and performance analytics, rankings per test
- **Feedback:** create, edit and reply to test feedback
- **Notifications:** stored notifications with read/read-all, delivered as push notifications through Firebase Cloud Messaging

## Tech stack

- Node.js, Express, TypeScript
- Prisma ORM on PostgreSQL (Neon)
- JWT authentication, bcrypt/argon2 password hashing
- Firebase Admin SDK (FCM) for push notifications
- Deployable to Vercel (`server/vercel.json`)

## API overview

| Base path | Purpose |
|---|---|
| `/api/auth` | Register, login, current user, push tokens |
| `/api/user` | Admin: users, classes, sections, subjects, marks approval, analytics, audit logs, feedback |
| `/api/teacher` | Teacher tests, distributions and student records |
| `/api/student` | Student dashboard and analytics |
| `/api/notifications` | List and mark notifications as read |
| `/health` | Health check |

## Getting started

```bash
git clone https://github.com/vishvajeet2012/serversql.git
cd serversql/server
npm install            # also runs prisma generate
```

Create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host/db
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
PORT=5000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Then:

```bash
npm run migrate:deploy   # apply Prisma migrations
npm run dev              # development with auto-reload
npm run build && npm start
```

## Author

Built by [Vishvajeet Shukla](https://www.vishvajeetshukla.in).
