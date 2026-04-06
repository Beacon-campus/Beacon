# Complete Project Deep-Dive Report

## 0. Scope

This report analyzes the project under `client/` and `server/`, excluding `node_modules`, generated build output, and static assets that do not contain executable logic.

- Project type: full-stack web app
- Frontend stack: React + Vite + Tailwind + Firebase client SDK
- Backend stack: Express + Mongoose + Firebase Admin + Socket.IO
- Realtime: Socket.IO
- File storage: Cloudinary
- AI: Google Gemini via `@google/generative-ai`
- Containerization present: backend `server/Dockerfile`
- Container orchestration present: none (`docker-compose.yml` is not present)

Exam-friendly summary:

> This is a role-based campus collaboration platform. The frontend is a React SPA. The backend exposes REST APIs, verifies Firebase tokens, stores business data in MongoDB, handles realtime chat/presence through Socket.IO, uploads files to Cloudinary, and supports assignments, notifications, study materials, and an AI assistant.

The repository already contains an exact import scan in `DEPENDENCY_IMPORT_INVENTORY.md`. This report focuses on architecture, flow, behavior, and per-file purpose.

---

## 1. Project Architecture Overview

### 1.1 Architectural style

This is not strict classical MVC. It is closer to a layered modular architecture:

- Frontend:
  - `pages/` = route-level screens
  - `layouts/` = role-specific shells
  - `components/` = reusable feature UI
  - `context/` = shared state and orchestration
  - `services/` = API, cache, socket, session helpers
  - `utils/` = pure helpers
- Backend:
  - `routes/` = endpoint declarations
  - `controllers/` = HTTP request/response logic
  - `services/` = business logic and cross-model work
  - `models/` = MongoDB schemas
  - `middleware/` = auth and global error handling
  - `utils/` = shared helper logic
  - `scripts/` = maintenance/migration utilities

### 1.2 Why this architecture fits this project

The app has many feature modules: auth, chat, assignments, classroom/community, notes, todos, sketches, uploads, admin dashboards, and university announcements. A layered design keeps:

- routes thin
- controller responsibilities clear
- business rules reusable
- models centralized
- frontend views separate from data/state orchestration

### 1.3 High-level component interaction

#### Frontend

1. `client/src/main.jsx` boots the app.
2. Global providers load auth and home/dashboard data.
3. `client/src/App.jsx` mounts chat/community/project providers and the route tree.
4. Page components render feature components.
5. Feature components call REST APIs, Socket.IO, and page-cache helpers.

#### Backend

1. `server/index.js` starts Express, DB, Firebase Admin, metrics, and Socket.IO.
2. Requests hit routes.
3. Protected routes pass through `verifyFirebaseToken`.
4. Controllers validate input and call services.
5. Services query/update Mongoose models.
6. Some services/controllers emit Socket.IO events for realtime UI updates.

### 1.4 Data responsibilities

- Firebase Auth: identity and sign-in
- Firestore: some onboarding/account flags
- MongoDB:
  - users and profile data
  - channels/messages
  - classrooms/subjects/uploads
  - assignments/submissions/doubts
  - todos, notes, sketches
  - calendars/timetables
  - announcements/logs/bot sessions
- Cloudinary:
  - uploaded files
  - image/PDF previews
  - calendar images

---

## 2. Execution Flow

## 2.1 What happens when the app starts

### Frontend startup

1. `client/src/main.jsx` checks `VITE_API_BASE_URL`.
2. React mounts the app inside `BrowserRouter`.
3. `ServerWakeupModal` can show backend warm-up state.
4. `AuthProvider` subscribes to Firebase auth state.
5. If a Firebase user exists:
   - Firestore flags are read
   - backend `/api/me` is called
   - the merged user object is stored in context
   - cache prefetch runs
6. `App.jsx` mounts:
   - `ChatProvider`
   - `CommunityProvider`
   - `ProjectProvider`
   - `SocketManager`
   - route tree
7. `ProtectedRoute` checks whether a user is authenticated and has the required role.

### Backend startup

1. `server/index.js` loads env values.
2. Firebase Admin is initialized from environment variables or local service account JSON.
3. Express app and HTTP server are created.
4. CORS, Helmet, rate limits, JSON parsing, and metrics middleware are configured.
5. MongoDB is connected through `server/config/db.js`.
6. Socket.IO is attached to the HTTP server.
7. LibreOffice is warmed so Office-file preview conversion is faster.
8. API routes are mounted.
9. Error handlers are attached.
10. Server listens on `PORT`.

## 2.2 What happens when a user logs in

1. `client/src/pages/Login.jsx` looks up the account by registration number or email.
2. Firebase Auth performs email/password or Google sign-in.
3. `AuthContext` detects auth state change.
4. `apiClient` starts attaching the Firebase ID token to requests.
5. `GET /api/me` reaches backend auth routes.
6. `verifyFirebaseToken` validates the Firebase token.
7. `auth.controller.js` calls `auth.service.js`.
8. The backend loads the Mongo user profile and merges account data.
9. The frontend stores the user and routes by role: student, teacher, or admin.

## 2.3 What happens during a normal authenticated request

1. A page/component/context calls `apiClient`.
2. `apiClient` injects `Authorization: Bearer <firebase-token>`.
3. Express route matches.
4. Auth middleware verifies the token if required.
5. Controller validates inputs.
6. Service performs business logic and Mongoose operations.
7. Controller returns JSON.
8. Frontend updates context/local state/cache.

## 2.4 What happens when a user sends a chat message

1. User types in `ChatWindow`, `GroupChatWindow`, or classroom/community chat inputs.
2. UI validates/censors input and optionally uploads attachments.
3. Client emits `send_message` over Socket.IO.
4. `server/services/socket.service.js` validates, persists, updates channel metadata, and broadcasts.
5. Chat-related contexts receive socket events and update visible message lists and unread counters.

## 2.5 What happens when a teacher publishes an assignment

1. `TeacherPublishAssigment.jsx` collects form data.
2. It posts to `/api/assignments`.
3. `assignment.controller.js` validates request.
4. `assignment.service.js` creates the assignment, posts an assignment message to the classroom channel, and generates notifications.
5. Students later see the assignment in chat/community/notifications.

## 2.6 What happens when a user uploads a file

1. Frontend validates type/size in `attachmentUpload.js`.
2. Images may be compressed client-side.
3. A base64 `dataUrl` is posted to `/api/uploads/chat-attachment`.
4. `uploads.controller.js` validates metadata.
5. `uploads.service.js` uploads to Cloudinary.
6. Office files may be converted to PDF preview via LibreOffice.
7. Backend returns attachment metadata and preview URLs/paths.
8. Frontend stores that metadata inside messages, study materials, or announcements.

---

## 3. Core Features Breakdown

### 3.1 Authentication and onboarding

- Frontend files:
  - `client/src/pages/Login.jsx`
  - `client/src/context/AuthContext.jsx`
  - `client/src/components/ChangePasswordModal.jsx`
  - `client/src/components/UpdateEmailModal.jsx`
- Backend files:
  - `server/routes/auth.route.js`
  - `server/controllers/auth.controller.js`
  - `server/services/auth.service.js`
  - `server/middleware/auth.js`

How it works:

- Firebase handles actual sign-in.
- Backend verifies tokens and returns role/profile data from MongoDB.
- Onboarding blocks access until password reset and email verification are complete.

### 3.2 Realtime chat and groups

- Frontend:
  - `ChatProvider.jsx`
  - `ChatMain.jsx`
  - `ChatWindow.jsx`
  - `GroupsMain.jsx`
  - `GroupChatWindow.jsx`
  - `SocketManager.jsx`
- Backend:
  - `chat.route.js`
  - `chat.controller.js`
  - `chat.service.js`
  - `socket.service.js`
  - `Channel.js`
  - `Message.js`

### 3.3 Classroom/community and announcements

- Frontend:
  - `CommunityContext.jsx`
  - `CommunityMain.jsx`
  - `OfficialChannel.jsx`
  - `StudentHub.jsx`
- Backend:
  - `classroom.route.js`
  - `classroom.controller.js`
  - `classroom.service.js`
  - `Announcement.js`
  - `Comment.js`
  - `Classroom.js`

### 3.4 Assignments, submissions, doubts, quiz mode

- Frontend:
  - `TeacherPublishAssigment.jsx`
  - `QuizActive.jsx`
  - `AssignmentModal.jsx`
  - `AssignmentMessageCard.jsx`
- Backend:
  - `assignment.route.js`
  - `assignment.controller.js`
  - `assignment.service.js`
  - `Assignment.js`
  - `Submission.js`
  - `Doubt.js`

### 3.5 Notes and markdown sharing

- Frontend: `Notes.jsx`, `CreateNote.jsx`, `NoteCard.jsx`, `ShareNoteModal.jsx`
- Backend: `notes.route.js`, `notes.controller.js`, `notes.service.js`, `Note.js`

### 3.6 Todos

- Frontend: `Todos.jsx`, `TodoModal.jsx`, `useTodos.js`, `HomeDataContext.jsx`
- Backend: `todos.route.js`, `todos.controller.js`, `todos.service.js`, `Todo.js`

### 3.7 Whiteboard/sketch

- Frontend: `Whiteboard.jsx`
- Backend: `sketches.route.js`, `sketches.controller.js`, `sketches.service.js`, `Sketch.js`

### 3.8 Calendar and timetable

- Frontend: `Calender.jsx`
- Backend: `calendar.route.js`, `calendar.controller.js`, `calendar.service.js`, `timetable.route.js`, `timetable.controller.js`, `timetable.service.js`, `AcademicCalendar.js`, `TimeTable.js`

### 3.9 University announcements

- Frontend: `AdminAnnouncements.jsx`, `university.service.js`, home widgets
- Backend: `university.route.js`, `university.controller.js`, `university.service.js`, `UniversityAnnouncement.js`

### 3.10 Admin management and observability

- Frontend: `AdminDashboard.jsx`, `UserManagement.jsx`, `BulkUpload.jsx`, `ClassroomManagement.jsx`, `ServerLogs.jsx`
- Backend: `admin.route.js`, `admin.controller.js`, `admin.service.js`, `metrics.service.js`, `logs.service.js`

---

## 4. Docker Analysis

## 4.1 What Docker is doing in this project

Docker is used only for the backend in the current repository.

Main reason:

- to package the Node backend together with system-level LibreOffice dependencies required for Office-to-PDF preview conversion
- to keep production runtime consistent across machines
- to avoid manual installation of Node + LibreOffice packages on every deployment host

Important exam point:

> Docker here is not just for Node. It is especially useful because file preview generation depends on LibreOffice binaries, which are harder to manage manually on every server.

## 4.2 Docker-related files present

- `server/Dockerfile`

Files not present:

- no `docker-compose.yml`
- no separate client Dockerfile
- no orchestration file for MongoDB or multi-service local deployment

## 4.3 Step-by-step Dockerfile explanation

File: `server/Dockerfile`

- `FROM node:22-bookworm`: official Node.js 22 base image on Debian Bookworm.
- `RUN apt-get update && apt-get install -y libreoffice ...`: installs LibreOffice and system libraries needed for document preview conversion.
- `WORKDIR /app`: sets the working directory inside the container.
- `COPY package*.json ./`: copies dependency manifests first for better layer caching.
- `RUN npm ci --omit=dev`: installs only production dependencies deterministically.
- `COPY . .`: copies the server source code into the image.
- `ENV NODE_ENV=production`: enables production runtime mode.
- `EXPOSE 10000`: documents the application port.
- `CMD ["npm", "start"]`: starts the Node server.

## 4.4 How the app runs inside Docker

1. Docker builds the image.
2. Node and LibreOffice are installed in the image.
3. Server source code is copied in.
4. When the container starts, `npm start` runs.
5. `server/index.js` loads env variables provided at runtime.
6. Backend connects to MongoDB, Firebase Admin, Cloudinary, and Gemini.
7. The HTTP API and Socket.IO server start listening.

## 4.5 How services communicate in Docker

Because no `docker-compose.yml` exists, the containerized backend is expected to communicate with external services over the network:

- MongoDB is likely hosted elsewhere
- Cloudinary is remote
- Firebase services are remote
- Gemini API is remote
- frontend may run separately and call the backend through `CLIENT_URL` / `VITE_API_BASE_URL`

## 4.6 Why Docker is beneficial here

- same runtime on every deployment host
- avoids “works on my machine” issues
- packages LibreOffice dependency with the app
- simplifies deployment for Node + native binary requirements

## 4.7 What happens if Docker is not used

The app can still run, but deployment becomes more fragile:

- Node version must match manually
- LibreOffice must be installed correctly by hand
- missing system packages can break preview generation
- environment setup becomes less reproducible

---

## 5. Environment and Configuration

### Client environment

File: `client/.env.example`

- `VITE_API_BASE_URL`: frontend base URL for backend API
- `VITE_GIPHY_API_KEY`: GIF search support
- Firebase web config values for app/auth/firestore

Effect:

- without `VITE_API_BASE_URL`, frontend intentionally throws at startup
- without Firebase config, login/auth flows break
- without GIPHY key, GIF search breaks

### Server environment

File: `server/.env.example`

- `API_URL`, `CLIENT_URL`, `TRUST_PROXY`
- `MONGO_URI`
- `GOOGLE_API_KEY`
- Cloudinary variables
- `LIBREOFFICE_PATH`
- Firebase Admin values
- calendar image Cloudinary IDs

Effect:

- missing `MONGO_URI`: backend cannot start
- missing Firebase Admin values: protected APIs fail
- missing Cloudinary values: uploads/previews fail
- missing Gemini API key: bot feature fails

### Build/config files

- `client/vite.config.js`: Vite + React plugin
- `client/tailwind.config.js`: Tailwind scanning and typography plugin
- `client/postcss.config.js`: Tailwind + autoprefixer
- `client/eslint.config.js`: linting rules
- `server/config/db.js`: DB bootstrap

---

## 6. Error Handling and Edge Cases

### Explicit error handling already present

- backend global `errorHandler` and `notFoundHandler`
- Firebase token verification failures return auth errors
- upload validation rejects unsupported type/size
- assignment/todo/note/sketch validation checks payload constraints
- rate limiting protects login lookup and bot routes
- frontend shows toast feedback for most failures
- cache helpers fail closed by returning `null`

### Important edge-case handling

- student DMs require friendship
- expired group chats can reject messaging
- sketch board blocks saves if serialized scene exceeds 1 MB
- todo service caps count and prunes old completed items
- bot sessions guard against huge stored history
- uploads support preview fallback states
- auth service tries Firestore-based recovery for some missing Mongo users

### Weaknesses / risks

- several frontend files use raw `axios` instead of shared `apiClient`, so token handling is duplicated
- some UI files are very large and mix many responsibilities
- `metrics.service.js` stores some timeline metrics in memory, so they reset on restart
- no `docker-compose.yml`, so local multi-service reproducibility is incomplete
- `server/controllers/todoController.js` is legacy/orphaned
- `client/src/services/doc.service.js` is a placeholder and not connected to real APIs
- `client/src/pages/admin/AdminCalendar.jsx` is still a placeholder

---

## 7. Simplified Viva Explanation

> This project is a full-stack role-based academic collaboration platform. The React frontend provides separate student, teacher, and admin interfaces. Firebase is used for authentication, and after login the frontend calls an Express backend. The backend verifies Firebase tokens, stores application data in MongoDB through Mongoose, and uses Socket.IO for realtime chat, notifications, typing status, and presence. Teachers can publish assignments and study materials, students can submit work and chat, admins can manage users and classrooms, and Cloudinary stores uploaded files. Docker is used on the backend so that Node and LibreOffice-based file preview generation run consistently in production.

Shorter viva version:

> Frontend handles UI and routing, backend handles APIs and business logic, Firebase handles auth, MongoDB stores app data, Socket.IO handles realtime communication, and Docker packages the backend runtime with LibreOffice for document preview generation.

---

## 8. Advanced Viva Questions and Answers

1. **Why is this not strict MVC?**  
   Because business logic is separated into services, routes are separate, and React frontend pages/components are independent from backend controllers. It is a layered modular architecture rather than classic server-side MVC.

2. **Why use Firebase and MongoDB together?**  
   Firebase handles authentication and identity; MongoDB stores domain data like classrooms, messages, assignments, and notes.

3. **Why is Socket.IO needed if REST already exists?**  
   REST is good for request/response fetches. Socket.IO is needed for low-latency push events like new messages, typing, presence, and live notification updates.

4. **Why are services useful on the backend?**  
   They keep business rules reusable and prevent controllers from becoming full of database logic.

5. **Why does the project use Cloudinary instead of storing files in MongoDB?**  
   Media/file storage is better handled by a specialized file CDN/storage provider. MongoDB stores metadata, not heavy binary assets.

6. **Why is LibreOffice installed in Docker?**  
   The backend converts Office files into preview PDFs. That requires system binaries, not just npm packages.

7. **How does authorization differ from authentication here?**  
   Firebase token verification proves identity. Role checks and feature restrictions determine what that user is allowed to do.

8. **What is the difference between `ChatProvider`, `CommunityContext`, and `ProjectContext`?**  
   They manage three different communication domains: DMs/teacher chats, classroom/community channels, and project group chats.

9. **What is cached on the frontend, and why?**  
   Session-scoped API responses like `/me`, notifications, todos, notes, classroom data, and admin views are cached to reduce repeated requests and speed navigation.

10. **Why is `apiClient` important?**  
   It centralizes API base URL and token injection. Without it, every component would duplicate auth-header logic.

11. **What is the purpose of `Channel.lastMessage` if messages are stored separately?**  
   It supports efficient chat list rendering without loading full message history each time.

12. **How are assignment doubts modeled?**  
   Through a `Doubt` document with replies, plus notification/socket logic so teachers and students see responses in the correct context.

13. **Why are there both REST notifications and socket events?**  
   Sockets provide immediate updates; persisted notifications allow later retrieval even if the user was offline.

14. **What would happen if MongoDB is down but Firebase Auth still works?**  
   Users could authenticate with Firebase, but most backend profile/business requests would fail because the app data is in MongoDB.

15. **What is one maintainability issue in this project?**  
   A few large files combine UI, fetch logic, and event handling in one place, which makes testing and modification harder.

16. **Why are some chat restrictions enforced server-side even if the UI already knows the rules?**  
   Server-side enforcement is necessary because client-side checks can be bypassed.

17. **What happens if Docker is removed from deployment?**  
   The backend can still run, but runtime setup becomes manual and preview conversion becomes especially fragile because LibreOffice must be installed correctly on the host.

18. **Why is there a `/health` route?**  
   It allows simple uptime or warm-up checks, especially useful for cloud deployments where the server may sleep.

---

## 9. File-by-File Code Explanation

This appendix uses a compact per-file format:

- **Purpose**: what the file is for
- **Logic**: important behavior/patterns
- **Dependencies**: external libraries used in that file
- **Depends on**: important local files/modules it imports
- **Imported by**: where it is used

### 9.1 Root, config, Docker, and env files

- `client/.env.example`: Purpose: sample client runtime config. Logic: documents required Vite/Firebase/GIPHY values. Dependencies: none. Depends on: none. Imported by: developers/build process.
- `client/vite.config.js`: Purpose: Vite build config. Logic: enables React plugin and dev/build behavior. Dependencies: `vite`, `@vitejs/plugin-react`. Depends on: none. Imported by: Vite runtime.
- `client/tailwind.config.js`: Purpose: Tailwind setup. Logic: defines content scan paths and typography plugin. Dependencies: `tailwindcss`, `@tailwindcss/typography`. Depends on: none. Imported by: Tailwind build process.
- `client/postcss.config.js`: Purpose: PostCSS pipeline. Logic: enables Tailwind and autoprefixer. Dependencies: Tailwind/PostCSS tooling. Depends on: none. Imported by: Vite/PostCSS.
- `client/eslint.config.js`: Purpose: lint rules. Logic: combines ESLint base config, React hooks, refresh rules, and globals. Dependencies: `eslint`, `@eslint/js`, `globals`, React lint plugins. Depends on: none. Imported by: ESLint.
- `server/.env.example`: Purpose: sample backend configuration. Logic: documents API, DB, Firebase, Cloudinary, Gemini, and LibreOffice settings. Dependencies: none. Depends on: none. Imported by: developers/runtime env injection.
- `server/Dockerfile`: Purpose: backend container image recipe. Logic: installs Node + LibreOffice, copies source, installs deps, starts server. Dependencies: Docker base image + apt packages. Depends on: server source tree. Imported by: Docker build.

### 9.2 Backend bootstrap, middleware, and utilities

- `server/index.js`: Purpose: backend entry point. Logic: initializes Firebase Admin, Express, Socket.IO, CORS, Helmet, rate limiting, DB, metrics, routes, and error handlers. Dependencies: `express`, `cors`, `helmet`, `express-rate-limit`, `firebase-admin`, `mongoose`. Depends on: DB config, middleware, routes, socket service, metrics service, models. Imported by: none; this is the entry.
- `server/config/db.js`: Purpose: MongoDB bootstrap. Logic: connects Mongoose to `MONGO_URI`, skips duplicate connection attempts, exits on fatal failure. Dependencies: `mongoose`. Depends on: none. Imported by: `server/index.js`, seeding/smoke scripts.
- `server/middleware/auth.js`: Purpose: auth guard. Logic: extracts Bearer token, verifies Firebase ID token, stores decoded user on `req.user`. Dependencies: `firebase-admin`. Depends on: none. Imported by: most protected routes and `server/index.js`.
- `server/middleware/error.middleware.js`: Purpose: global 404 and error handling. Logic: returns JSON errors and logs server-side details. Dependencies: none. Depends on: none. Imported by: `server/index.js`.
- `server/utils/classroomUtils.js`: Purpose: enrollment helper. Logic: enrolls/removes students from matching classroom and related channels during admin operations. Dependencies: Mongoose models. Depends on: `Classroom.js`, `Channel.js`. Imported by: `admin.controller.js`.
- `server/utils/cloudinaryUrl.js`: Purpose: Cloudinary URL helper. Logic: builds deterministic direct URLs from Cloudinary metadata. Dependencies: none. Depends on: none. Imported by: `calendar.controller.js`.

### 9.3 Backend models

- `server/models/User.js`: Purpose: user schema. Logic: stores Firebase identity mapping, role, profile, friends, friend requests, notifications, enrollment, and disabled state. Dependencies: `mongoose`. Depends on: none. Imported by: auth, admin, chat, assignment, notifications, logs, university, metrics, and more.
- `server/models/Classroom.js`: Purpose: classroom schema. Logic: stores classroom identity, metadata, students, subjects, uploads, and official/unofficial channel IDs. Dependencies: `mongoose`. Depends on: none. Imported by: admin, classroom, chat, assignment, metrics, utils.
- `server/models/Channel.js`: Purpose: chat-channel schema. Logic: supports DMs, project groups, community, and classroom channels with participants, admin, deadline, and read status. Dependencies: `mongoose`. Depends on: none. Imported by: admin, chat, assignment, socket, metrics, utils.
- `server/models/Message.js`: Purpose: message schema. Logic: stores text/GIF/file/note/assignment messages, deletion state, and seen/read lists. Dependencies: `mongoose`. Depends on: none. Imported by: chat, assignment, admin, socket, metrics, migration script.
- `server/models/Assignment.js`: Purpose: assignment schema. Logic: stores classroom assignment metadata, type, deadline, quiz/QnA/offline content, and submissions summary. Dependencies: `mongoose`. Depends on: none. Imported by: assignment controller/service and metrics.
- `server/models/Submission.js`: Purpose: student submission schema. Logic: stores answers, files, attempts, cheat flags, grading, and feedback. Dependencies: `mongoose`. Depends on: none. Imported by: assignment logic and migration script.
- `server/models/Doubt.js`: Purpose: assignment doubt schema. Logic: stores student doubts, resolution state, and threaded replies. Dependencies: `mongoose`. Depends on: none. Imported by: assignment logic.
- `server/models/Announcement.js`: Purpose: classroom announcement schema. Logic: persists official channel/classroom announcements. Dependencies: `mongoose`. Depends on: none. Imported by: classroom service, metrics, migration script.
- `server/models/Comment.js`: Purpose: threaded comment schema. Logic: stores classroom comment/reply threads on announcements. Dependencies: `mongoose`. Depends on: none. Imported by: classroom service.
- `server/models/Todo.js`: Purpose: todo schema. Logic: stores user-scoped tasks, completion state, and due dates. Dependencies: `mongoose`. Depends on: none. Imported by: todo service and legacy controller.
- `server/models/Note.js`: Purpose: note schema. Logic: stores markdown note content and ownership. Dependencies: `mongoose`. Depends on: none. Imported by: notes service.
- `server/models/Sketch.js`: Purpose: sketch schema. Logic: stores one persisted Excalidraw scene per user. Dependencies: `mongoose`. Depends on: none. Imported by: sketches service.
- `server/models/BotSessions.js`: Purpose: bot history schema. Logic: stores Gemini conversation history and summary metadata. Dependencies: `mongoose`. Depends on: none. Imported by: bot service.
- `server/models/AcademicCalendar.js`: Purpose: academic calendar schema. Logic: stores yearly event data and calendar image metadata. Dependencies: `mongoose`. Depends on: none. Imported by: calendar controller/service.
- `server/models/TimeTable.js`: Purpose: timetable schema. Logic: stores weekly schedules for teachers/students by academic filters. Dependencies: `mongoose`. Depends on: none. Imported by: timetable service.
- `server/models/UniversityAnnouncement.js`: Purpose: university-wide announcement schema. Logic: stores title/content/attachment metadata for campus announcements. Dependencies: `mongoose`. Depends on: none. Imported by: university service, metrics, seed/smoke/migration scripts.
- `server/models/Log.js`: Purpose: log schema. Logic: stores structured server/audit log entries. Dependencies: `mongoose`. Depends on: none. Imported by: logs service.

### 9.4 Backend routes

- `server/routes/auth.route.js`: Purpose: auth endpoints. Logic: exposes login lookup, `/me`, logout, profile update, email sync; applies Firebase auth to protected methods. Dependencies: `express`. Depends on: `auth.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/chat.route.js`: Purpose: chat endpoints. Logic: maps chat/channel/message CRUD and read endpoints. Dependencies: `express`. Depends on: `chat.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/classroom.route.js`: Purpose: classroom/community endpoints. Logic: maps study materials, announcements, comments, class info, and community operations. Dependencies: `express`. Depends on: `classroom.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/assignment.route.js`: Purpose: assignment endpoints. Logic: maps create, list, submit, grade, doubts, quiz flow, cheating flags, and deletion. Dependencies: `express`. Depends on: `assignment.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/admin.route.js`: Purpose: admin endpoints. Logic: maps user management, classroom network management, dashboard metrics, and server logs. Dependencies: `express`. Depends on: `admin.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/todos.route.js`: Purpose: todo endpoints. Logic: CRUD for user todos. Dependencies: `express`. Depends on: `todos.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/notes.route.js`: Purpose: note endpoints. Logic: CRUD for notes. Dependencies: `express`. Depends on: `notes.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/sketches.route.js`: Purpose: sketch endpoints. Logic: get/save sketch scene. Dependencies: `express`. Depends on: `sketches.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/calendar.route.js`: Purpose: academic calendar endpoints. Logic: current calendar fetch, calendar image proxy, admin image updates. Dependencies: `express`. Depends on: `calendar.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/timetable.route.js`: Purpose: timetable endpoints. Logic: weekly timetable lookup. Dependencies: `express`. Depends on: `timetable.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/bot.route.js`: Purpose: AI bot endpoints. Logic: chat/history/session operations, protected by auth. Dependencies: `express`. Depends on: `bot.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/friends.route.js`: Purpose: friendship endpoints. Logic: search, request, accept, decline, remove, and user lookup for requests. Dependencies: `express`. Depends on: `friends.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/notifications.route.js`: Purpose: notification endpoints. Logic: fetch, mark read, clear, delete. Dependencies: `express`. Depends on: `notifications.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/quotes.route.js`: Purpose: public quote endpoint. Logic: returns a random quote from Mongo. Dependencies: `express`. Depends on: `quotes.controller.js`. Imported by: `server/index.js`.
- `server/routes/uploads.route.js`: Purpose: upload endpoints. Logic: handles chat/general attachment upload and deprecated download route. Dependencies: `express`. Depends on: `uploads.controller.js`, `auth.js`. Imported by: `server/index.js`.
- `server/routes/university.route.js`: Purpose: university announcement/admin endpoints. Logic: posts and lists campus-wide announcements; also reuses admin role verification. Dependencies: `express`. Depends on: `university.controller.js`, `admin.controller.js`, `auth.js`. Imported by: `server/index.js`.

### 9.5 Backend controllers

- `server/controllers/auth.controller.js`: Purpose: auth-facing request handlers. Logic: login lookup, `/me` response, logout logging, profile updates, email sync. Dependencies: service layer + log service. Depends on: `auth.service.js`, `logs.service.js`. Imported by: `auth.route.js`.
- `server/controllers/chat.controller.js`: Purpose: chat HTTP handlers. Logic: channel lists, classmates, teacher virtual chats, message history pagination, chat creation, group management, read updates. Dependencies: chat service + user model. Depends on: `chat.service.js`, `User.js`. Imported by: `chat.route.js`.
- `server/controllers/classroom.controller.js`: Purpose: classroom/community handlers. Logic: study material fetch/upload/rename/delete, announcements/comments, class details updates. Dependencies: classroom and log services. Depends on: `classroom.service.js`, `logs.service.js`. Imported by: `classroom.route.js`.
- `server/controllers/assignment.controller.js`: Purpose: assignment handlers. Logic: create/list assignments, submit work, grade, start/submit quiz, manage doubts/replies, delete assignment. Dependencies: models + assignment service. Depends on: `assignment.service.js`, assignment-related models. Imported by: `assignment.route.js`.
- `server/controllers/admin.controller.js`: Purpose: admin handlers. Logic: role verification, user CRUD, bulk classroom creation/deletion, subject assignment, dashboard metrics, logs. Dependencies: admin/metrics/log services and classroom utils. Depends on: `admin.service.js`, `metrics.service.js`, `logs.service.js`, models. Imported by: `admin.route.js`, `university.route.js`.
- `server/controllers/todos.controller.js`: Purpose: todo handlers. Logic: CRUD wrappers over the todo service. Dependencies: todo service. Depends on: `todos.service.js`. Imported by: `todos.route.js`.
- `server/controllers/todoController.js`: Purpose: legacy todo controller. Logic: old direct model-based todo handling; not wired into current routes. Dependencies: Mongoose models. Depends on: `Todo.js`, `User.js`. Imported by: none; orphaned legacy file.
- `server/controllers/notes.controller.js`: Purpose: note handlers. Logic: CRUD wrappers over note service. Dependencies: note service. Depends on: `notes.service.js`. Imported by: `notes.route.js`.
- `server/controllers/sketches.controller.js`: Purpose: sketch handlers. Logic: load/save user sketch. Dependencies: sketches service. Depends on: `sketches.service.js`. Imported by: `sketches.route.js`.
- `server/controllers/calendar.controller.js`: Purpose: calendar handlers. Logic: chooses current academic year, returns calendar events/image candidates, proxies calendar images, updates calendar images for admins. Dependencies: calendar service, uploads service, calendar/user models. Depends on: `calendar.service.js`, `uploads.service.js`, `AcademicCalendar.js`, `User.js`, cloudinary util. Imported by: `calendar.route.js`.
- `server/controllers/timetable.controller.js`: Purpose: timetable handlers. Logic: validates query params and returns schedule by role filters. Dependencies: timetable service. Depends on: `timetable.service.js`. Imported by: `timetable.route.js`.
- `server/controllers/bot.controller.js`: Purpose: bot handlers. Logic: chat requests, history/session management, request validation. Dependencies: bot service. Depends on: `bot.service.js`. Imported by: `bot.route.js`.
- `server/controllers/friends.controller.js`: Purpose: friendship handlers. Logic: request lifecycle and search/list helper responses. Dependencies: friends service. Depends on: `friends.service.js`. Imported by: `friends.route.js`.
- `server/controllers/notifications.controller.js`: Purpose: notification handlers. Logic: fetch/mark/clear/delete notifications. Dependencies: notifications service. Depends on: `notifications.service.js`. Imported by: `notifications.route.js`.
- `server/controllers/quotes.controller.js`: Purpose: quote handler. Logic: returns random quote from service. Dependencies: quotes service. Depends on: `quotes.service.js`. Imported by: `quotes.route.js`.
- `server/controllers/university.controller.js`: Purpose: university announcement handlers. Logic: validates admin posts, optional attachment payloads, emits realtime events, logs actions. Dependencies: university + log services. Depends on: `university.service.js`, `logs.service.js`. Imported by: `university.route.js`.
- `server/controllers/uploads.controller.js`: Purpose: upload handlers. Logic: validates incoming attachment payload, calls upload/preview pipeline, logs result, returns metadata; deprecated direct download route returns 410. Dependencies: uploads service + log service. Depends on: `uploads.service.js`, `logs.service.js`. Imported by: `uploads.route.js`.

### 9.6 Backend services

- `server/services/auth.service.js`: Purpose: auth business logic. Logic: login lookup by regno/email, `/me` assembly, avatar validation, profile update, Firebase email sync. Dependencies: `firebase-admin`, model access. Depends on: `User.js`. Imported by: `auth.controller.js`.
- `server/services/chat.service.js`: Purpose: chat data/business service. Logic: builds chat lists, enforces DM rules, loads paginated history, creates DMs/groups, marks read, manages group membership/admin transfers. Dependencies: `mongoose`. Depends on: `Channel.js`, `Message.js`, `Classroom.js`, `User.js`. Imported by: `chat.controller.js`.
- `server/services/classroom.service.js`: Purpose: classroom/community service. Logic: teacher/student study material views, announcement/comment CRUD, classroom details updates, subject upload management. Dependencies: `mongoose`. Depends on: `Announcement.js`, `Comment.js`, `Classroom.js`, `User.js`. Imported by: `classroom.controller.js`.
- `server/services/assignment.service.js`: Purpose: assignment service. Logic: creates assignments, posts assignment messages, tracks submissions, grades quizzes, manages doubts/replies, cascades deletions, emits notifications. Dependencies: `mongoose`. Depends on: `Assignment.js`, `Submission.js`, `Doubt.js`, `Channel.js`, `Message.js`, `Classroom.js`, `User.js`. Imported by: `assignment.controller.js`.
- `server/services/admin.service.js`: Purpose: admin business logic. Logic: creates users in Firebase/Mongo/Firestore, toggles disabled status, updates/deletes accounts, creates full classroom networks, assigns teachers, cleans related data. Dependencies: `firebase-admin`, `mongoose`. Depends on: `User.js`, `Classroom.js`, `Channel.js`, `Message.js`. Imported by: `admin.controller.js`.
- `server/services/todos.service.js`: Purpose: todo service. Logic: CRUD plus todo-count limits and completed-item pruning. Dependencies: `mongoose`. Depends on: `Todo.js`. Imported by: `todos.controller.js`.
- `server/services/notes.service.js`: Purpose: note service. Logic: note CRUD with validation that title/content is not empty. Dependencies: `mongoose`. Depends on: `Note.js`. Imported by: `notes.controller.js`.
- `server/services/sketches.service.js`: Purpose: sketch service. Logic: one-sketch-per-user load/save with payload size guard. Dependencies: `mongoose`. Depends on: `Sketch.js`. Imported by: `sketches.controller.js`.
- `server/services/calendar.service.js`: Purpose: calendar service. Logic: fetches calendar by year and resolves image download helpers. Dependencies: `mongoose`. Depends on: `AcademicCalendar.js`. Imported by: `calendar.controller.js`.
- `server/services/timetable.service.js`: Purpose: timetable service. Logic: resolves teacher/student weekly schedules by academic filters. Dependencies: `mongoose`. Depends on: `TimeTable.js`. Imported by: `timetable.controller.js`.
- `server/services/bot.service.js`: Purpose: AI chatbot service. Logic: manages Gemini prompts, session history, rolling summaries, and cleanup limits. Dependencies: `@google/generative-ai`, `mongoose`. Depends on: `BotSessions.js`. Imported by: `bot.controller.js`.
- `server/services/friends.service.js`: Purpose: friendship service. Logic: student-only friend search/request/accept/decline/remove and related notification payload building. Dependencies: `mongoose`. Depends on: `User.js`. Imported by: `friends.controller.js`.
- `server/services/notifications.service.js`: Purpose: notification service. Logic: fetches, marks read, clears, and deletes notifications from user documents. Dependencies: `mongoose`. Depends on: `User.js`. Imported by: `notifications.controller.js`.
- `server/services/quotes.service.js`: Purpose: quote service. Logic: uses raw collection access to sample a random quote. Dependencies: `mongoose`. Depends on: none local model. Imported by: `quotes.controller.js`.
- `server/services/university.service.js`: Purpose: university announcement service. Logic: creates/list announcements and resolves poster context. Dependencies: `mongoose`. Depends on: `UniversityAnnouncement.js`, `User.js`. Imported by: `university.controller.js`.
- `server/services/uploads.service.js`: Purpose: upload pipeline. Logic: validates MIME types, enforces size limits, uploads to Cloudinary, converts Office docs to PDF preview via LibreOffice, builds safe folder paths, returns download/preview metadata. Dependencies: `cloudinary`, `libreoffice-convert`, `p-queue`. Depends on: none local. Imported by: uploads/calendar controllers, metrics, and scripts.
- `server/services/socket.service.js`: Purpose: realtime server logic. Logic: creates Socket.IO server, manages rooms, presence map, typing events, seen events, message persistence, and chat update broadcasts. Dependencies: `socket.io`, `mongoose`. Depends on: `Channel.js`, `Message.js`, `User.js`. Imported by: `server/index.js`.
- `server/services/logs.service.js`: Purpose: logging service. Logic: structured log creation, actor resolution, auth dedupe window, paginated log retrieval. Dependencies: `mongoose`. Depends on: `Log.js`, `User.js`. Imported by: multiple controllers.
- `server/services/metrics.service.js`: Purpose: dashboard metrics service. Logic: request middleware, periodic samples, document counts, Firebase/Cloudinary usage, and dashboard overview/timeline. Dependencies: `firebase-admin`, `cloudinary`, `mongoose`. Depends on: several models and `uploads.service.js`. Imported by: `admin.controller.js`, `server/index.js`.

### 9.7 Backend scripts

- `server/scripts/auditCloudinary.mjs`: Purpose: audit utility. Logic: scans Mongo/Cloudinary references to inspect media usage. Dependencies: native Mongo driver. Depends on: none local. Imported by: none; standalone script.
- `server/scripts/fetchQuotes.mjs`: Purpose: quote seeding/import utility. Logic: fetches or writes quote data into Mongo. Dependencies: `mongoose`. Depends on: none local. Imported by: none.
- `server/scripts/fixTeacherFromChannel.mjs`: Purpose: repair script. Logic: reconciles teacher/channel data inconsistencies. Dependencies: `mongoose`. Depends on: none local. Imported by: none.
- `server/scripts/migrateLegacyAttachments.mjs`: Purpose: attachment migration script. Logic: migrates older attachment shapes into current Cloudinary metadata format across announcements/messages/submissions. Dependencies: `dotenv`, `mongoose`. Depends on: multiple models + `uploads.service.js`. Imported by: none.
- `server/scripts/migrateUploadUrls.mjs`: Purpose: URL migration script. Logic: normalizes stored upload URLs/metadata. Dependencies: `dotenv`, `mongoose`. Depends on: none local. Imported by: none.
- `server/scripts/seedUniversityAnnouncements.mjs`: Purpose: seed script. Logic: connects DB, uploads optional media, and inserts sample university announcements. Dependencies: `dotenv`, `mongoose`, `cloudinary`. Depends on: DB config, `UniversityAnnouncement.js`, `User.js`, `uploads.service.js`. Imported by: none.
- `server/scripts/smokeUniversityImageAnnouncement.mjs`: Purpose: smoke test script. Logic: verifies university-image announcement flow end to end. Dependencies: `dotenv`, `mongoose`, `cloudinary`. Depends on: DB config, `UniversityAnnouncement.js`, `User.js`, `uploads.service.js`. Imported by: none.

### 9.8 Frontend bootstrap, context, and services

- `client/src/main.jsx`: Purpose: frontend entry. Logic: validates API base URL, exports `server`, mounts router and top-level providers. Dependencies: `react-dom`, `react-router-dom`. Depends on: `App.jsx`, `AuthContext.jsx`, `HomeDataContext.jsx`, `ServerWakeupModal.jsx`. Imported by: none; entry file.
- `client/src/App.jsx`: Purpose: route assembly. Logic: wraps app in chat/community/project providers and defines all protected/public routes. Dependencies: `react-router-dom`, `react-hot-toast`. Depends on: layouts, pages, providers, `ProtectedRoute.jsx`, `SocketManager.jsx`. Imported by: `main.jsx`.
- `client/src/index.css`: Purpose: global style sheet. Logic: Tailwind base/utilities plus shared animations and class styles used across the app. Dependencies: Tailwind CSS build pipeline. Depends on: none. Imported by: `main.jsx`.
- `client/src/firebase/firebase.js`: Purpose: Firebase client bootstrap. Logic: initializes app, auth, Google provider, and Firestore from Vite env. Dependencies: Firebase SDK. Depends on: none. Imported by: auth-related contexts/services/components.
- `client/src/context/AuthContext.jsx`: Purpose: global auth state. Logic: watches Firebase auth, fetches Firestore flags and `/api/me`, merges user profile, runs onboarding and prefetch logic, exposes `refreshUser`. Dependencies: React, Firebase. Depends on: Firebase init, page cache/prefetch services. Imported by: many layouts/components/providers.
- `client/src/context/ChatContext.js`: Purpose: chat context definition. Logic: exports context and `useChat` hook used by chat/group components. Dependencies: React. Depends on: none. Imported by: `ChatProvider.jsx` and chat-related components.
- `client/src/context/ChatProvider.jsx`: Purpose: DM/teacher-chat state manager. Logic: loads chat lists/messages/classmates, caches active channel state, handles socket events, seen state, typing, and unread counts. Dependencies: React, `axios`, Socket.IO. Depends on: `ChatContext.js`, `AuthContext.jsx`, `socket.service.js`, Firebase init. Imported by: `App.jsx`.
- `client/src/context/CommunityContext.jsx`: Purpose: classroom/community state manager. Logic: loads classroom lists, official announcements, student-hub messages, comments/doubts, class details, and socket-driven updates. Dependencies: React, `axios`. Depends on: `socket.service.js`, `apiClient.js`, page cache. Imported by: `App.jsx`.
- `client/src/context/ProjectContext.jsx`: Purpose: project-group state manager. Logic: loads project groups, messages, member data, and realtime updates. Dependencies: React, `axios`. Depends on: `socket.service.js`, `apiClient.js`. Imported by: `App.jsx`.
- `client/src/context/HomeDataContext.jsx`: Purpose: dashboard/home shared data. Logic: centralizes todos, notes, notifications, current calendar, and university announcements with caching helpers and CRUD wrappers. Dependencies: React, `react-hot-toast`. Depends on: todo/note/university services, page cache. Imported by: `main.jsx`.
- `client/src/services/apiClient.js`: Purpose: shared HTTP client. Logic: creates Axios instance, sets base URL, injects Firebase ID token in request interceptor. Dependencies: `axios`, Firebase. Depends on: Firebase init. Imported by: most services and many pages/components.
- `client/src/services/pageCache.service.js`: Purpose: session cache layer. Logic: stores per-user page responses in `sessionStorage` with TTL support and prefix invalidation. Dependencies: browser storage only. Depends on: none. Imported by: many contexts/pages/services.
- `client/src/services/sessionPrefetch.service.js`: Purpose: post-login cache warming. Logic: prefetches common endpoints in stages after auth success. Dependencies: shared API client. Depends on: `apiClient.js`, page cache. Imported by: `AuthContext.jsx`.
- `client/src/services/session.service.js`: Purpose: logout/session reset helper. Logic: notifies backend logout endpoint and clears page cache/hidden feature state. Dependencies: shared API client. Depends on: `apiClient.js`, page cache, feature service. Imported by: auth-related modals/navbar/login.
- `client/src/services/socket.service.js`: Purpose: frontend Socket.IO singleton. Logic: connects to backend host derived from API base URL. Dependencies: `socket.io-client`. Depends on: none. Imported by: contexts and realtime components.
- `client/src/services/todo.service.js`: Purpose: todo API wrapper. Logic: thin CRUD wrappers around backend todo endpoints. Dependencies: Axios via shared client. Depends on: `apiClient.js`. Imported by: `HomeDataContext.jsx`.
- `client/src/services/note.service.js`: Purpose: note API wrapper. Logic: thin note CRUD wrapper. Dependencies: Axios via shared client. Depends on: `apiClient.js`. Imported by: notes flows.
- `client/src/services/sketch.service.js`: Purpose: sketch API wrapper. Logic: load/save Excalidraw scene. Dependencies: Axios via shared client. Depends on: `apiClient.js`. Imported by: `Whiteboard.jsx`.
- `client/src/services/university.service.js`: Purpose: university announcement/admin fetcher. Logic: fetches announcements and admin dashboard data with page cache support. Dependencies: Firebase + shared API client. Depends on: `apiClient.js`, page cache, Firebase init. Imported by: `HomeDataContext.jsx`, `AdminAnnouncements.jsx`, `AdminDashboard.jsx`.
- `client/src/services/feature.service.js`: Purpose: hidden-feature/easter-egg state. Logic: tracks tap count in `sessionStorage` and unlocks hidden credits event at a threshold. Dependencies: browser storage only. Depends on: `feature.constants.js`. Imported by: `Profile.jsx`, `session.service.js`.
- `client/src/services/doc.service.js`: Purpose: placeholder doc API layer. Logic: currently returns empty arrays for subjects/docs and is not connected to real APIs. Dependencies: none. Depends on: none. Imported by: none active; legacy placeholder.

### 9.9 Frontend hooks and utility/config files

- `client/src/hooks/useTodos.js`: Purpose: todo UI hook. Logic: wraps todo state interactions for the `Todos` component. Dependencies: React. Depends on: todo/home services. Imported by: `Todos.jsx`.
- `client/src/hooks/useNotes.js`: Purpose: note helper hook. Logic: handles note refresh/update side effects and user feedback. Dependencies: React, `react-hot-toast`. Depends on: note/home services. Imported by: `Notes.jsx`, `SharedNoteBubble.jsx`.
- `client/src/config/breadcrumbs.js`: Purpose: breadcrumb config. Logic: maps route segments to breadcrumb labels. Dependencies: none. Depends on: none. Imported by: `Breadcrumb.jsx`.
- `client/src/utils/attachmentUpload.js`: Purpose: file-upload helper. Logic: validates attachments, compresses images, converts file to data URL, posts upload payload, normalizes returned metadata. Dependencies: `axios`, `browser-image-compression`, Firebase. Depends on: Firebase init and exported `server` from `main.jsx`. Imported by: chat/community/group/admin/study-material flows.
- `client/src/utils/avatarUtils.js`: Purpose: avatar URL helper. Logic: resolves user avatar image path/metadata for display. Dependencies: none. Depends on: none. Imported by: many user-list/message/profile components.
- `client/src/utils/chatConstants.js`: Purpose: chat constants. Logic: centralizes message/file type constants and UI limits. Dependencies: none. Depends on: none. Imported by: chat/community components.
- `client/src/utils/cloudinaryUrl.js`: Purpose: Cloudinary URL helper. Logic: builds optimized or direct attachment URLs from Cloudinary metadata. Dependencies: none. Depends on: none. Imported by: calendar/docs/messages/announcements.
- `client/src/utils/excelExport.js`: Purpose: Excel export helper. Logic: creates workbook rows/columns and triggers XLSX downloads. Dependencies: `exceljs`, `file-saver`. Depends on: none. Imported by: calendar and teacher assignment page.
- `client/src/utils/feature.constants.js`: Purpose: hidden-feature constants. Logic: defines unlock threshold and event names. Dependencies: none. Depends on: none. Imported by: `FeatureList.jsx`, `Profile.jsx`, `feature.service.js`.
- `client/src/utils/loadingMessages.js`: Purpose: loading-state text source. Logic: exports rotating or categorized loading messages. Dependencies: none. Depends on: none. Imported by: `LoadingState.jsx`.
- `client/src/utils/preloadAsset.js`: Purpose: asset preload helper. Logic: preloads media used on login or other screens to reduce flicker. Dependencies: browser APIs. Depends on: none. Imported by: `Login.jsx`.
- `client/src/utils/profanityFilter.js`: Purpose: profanity guard. Logic: configures `obscenity` matcher/censor and exports helpers used before sending user-generated text. Dependencies: `obscenity`. Depends on: none. Imported by: chat/community/group inputs.

### 9.10 Frontend layouts

- `client/src/layouts/studentlayout/StudentLayout.jsx`: Purpose: student shell. Logic: renders desktop sidebar, mobile nav, navbar, breadcrumb, onboarding blockers, and offline/online toasts. Dependencies: React, `react-router-dom`, `react-hot-toast`. Depends on: `Navbar.jsx`, `Breadcrumb.jsx`, auth/onboarding modals. Imported by: `App.jsx`.
- `client/src/layouts/teacherlayout/TeacherLayout.jsx`: Purpose: teacher shell. Logic: same pattern as student layout but with teacher navigation and route grouping. Dependencies: React, `react-router-dom`, `react-hot-toast`. Depends on: navbar, breadcrumb, auth modals. Imported by: `App.jsx`.
- `client/src/layouts/adminlayout/AdminLayout.jsx`: Purpose: admin shell. Logic: admin sidebar/topbar, protected outlet, onboarding blockers, admin navigation. Dependencies: React, `react-router-dom`, `react-hot-toast`. Depends on: navbar, auth modals. Imported by: `App.jsx`.

### 9.11 Frontend page components

- `client/src/pages/Login.jsx`: Purpose: login screen. Logic: handles regno lookup, Firebase email/password and Google sign-in, forgot password, onboarding modals, and backend health ping. Dependencies: React, Firebase, Axios, routing, toast, DotLottie. Depends on: Firebase init, `AuthContext.jsx`, preload/session helpers. Imported by: `App.jsx`.
- `client/src/pages/student/StudentProfile.jsx`: Purpose: student profile route. Logic: thin wrapper around shared profile component. Dependencies: React. Depends on: `components/Profile.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/TeacherProfile.jsx`: Purpose: teacher profile route. Logic: thin wrapper around shared profile component. Dependencies: React. Depends on: `components/Profile.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentHome.jsx`: Purpose: student dashboard route. Logic: assembles home widgets, home summaries, and socket-aware updates. Dependencies: React, routing. Depends on: home widgets, contexts, socket service. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherHome.jsx`: Purpose: teacher dashboard route. Logic: teacher version of home dashboard and widgets. Dependencies: React, routing. Depends on: home widgets, contexts, socket service. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentTodos.jsx`: Purpose: student todo route. Logic: wrapper around shared todo component. Dependencies: React. Depends on: `components/todocomps/Todos.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherTodos.jsx`: Purpose: teacher todo route. Logic: wrapper around shared todo component. Dependencies: React. Depends on: `components/todocomps/Todos.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentNotes.jsx`: Purpose: student notes route. Logic: wrapper around shared notes component. Dependencies: React. Depends on: `components/notecomps/Notes.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherNotes.jsx`: Purpose: teacher notes route. Logic: wrapper around shared notes component. Dependencies: React. Depends on: `components/notecomps/Notes.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentSketch.jsx`: Purpose: student sketch route. Logic: wrapper around whiteboard. Dependencies: React. Depends on: `components/Whiteboard.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherSketch.jsx`: Purpose: teacher sketch route. Logic: wrapper around whiteboard. Dependencies: React. Depends on: `components/Whiteboard.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentCalender.jsx`: Purpose: student calendar route. Logic: wrapper around shared calendar component. Dependencies: React. Depends on: `components/Calender.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherCalender.jsx`: Purpose: teacher calendar route. Logic: wrapper around shared calendar component. Dependencies: React. Depends on: `components/Calender.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentStudyBot.jsx`: Purpose: student bot route. Logic: wrapper around bot chat UI. Dependencies: React. Depends on: `components/bot_comps/BotMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherResearchBot.jsx`: Purpose: teacher bot route. Logic: wrapper around same bot UI. Dependencies: React. Depends on: `components/bot_comps/BotMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_home/StudentNotif.jsx`: Purpose: student notifications route. Logic: wrapper around shared notifications component. Dependencies: React. Depends on: `components/Notifications.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_home/TeacherNotif.jsx`: Purpose: teacher notifications route. Logic: wrapper around shared notifications component. Dependencies: React. Depends on: `components/Notifications.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_community/StudentCommunity.jsx`: Purpose: student DM/community messages route. Logic: renders `ChatMain` in student mode. Dependencies: React. Depends on: `components/chat_comps/ChatMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_community/TeacherCommunity.jsx`: Purpose: teacher DM/community messages route. Logic: renders `ChatMain` in teacher mode. Dependencies: React. Depends on: `components/chat_comps/ChatMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_community/StudentClassRoom.jsx`: Purpose: student classroom route. Logic: renders shared classroom/community UI for student role. Dependencies: React. Depends on: `components/community_comps/CommunityMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_community/TeacherClassRooms.jsx`: Purpose: teacher classroom route. Logic: renders shared classroom/community UI for teacher role. Dependencies: React. Depends on: `components/community_comps/CommunityMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_community/StudentGroups.jsx`: Purpose: student project-group route. Logic: wrapper around groups UI. Dependencies: React. Depends on: `components/group_comps/GroupsMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_community/TeacherGroups.jsx`: Purpose: teacher project-group route. Logic: wrapper around groups UI. Dependencies: React. Depends on: `components/group_comps/GroupsMain.jsx`. Imported by: `App.jsx`.
- `client/src/pages/student/student_community/StudentStudyMaterials.jsx`: Purpose: student study-material route. Logic: loads classroom/subject uploads for student viewing and previewing. Dependencies: React, toast. Depends on: docs components, shared API/cache services. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_community/TeacherUploadStudyMaterials.jsx`: Purpose: teacher study-material route. Logic: loads teacher classrooms/subjects, uploads materials, renames/deletes uploads, updates cache. Dependencies: React, toast. Depends on: `DocLayout`, `apiClient.js`, page cache, upload helper. Imported by: `App.jsx`.
- `client/src/pages/student/student_community/QuizActive.jsx`: Purpose: active quiz attempt page. Logic: fetches assignment details, manages timer/answers, submits quiz, and handles navigation guards. Dependencies: React, routing, toast. Depends on: shared API client/auth state. Imported by: `App.jsx`.
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: Purpose: teacher assignment workspace. Logic: publishes assignments, parses Excel-based quizzes, shows assignment lists, grading UI, doubt replies, submission previews, and download helpers. Dependencies: React, `exceljs`, `react-datepicker`, routing, toast. Depends on: modal/doc viewer/auth/socket/cache helpers. Imported by: `App.jsx`.
- `client/src/pages/admin/AdminDashboard.jsx`: Purpose: admin dashboard route. Logic: fetches overview/timeline metrics, refreshes charts/cards, and displays system health data. Dependencies: React, toast, charting libs used in the page. Depends on: `university.service.js`, `apiClient.js`, cache helpers. Imported by: `App.jsx`.
- `client/src/pages/admin/UserManagement.jsx`: Purpose: admin user management route. Logic: loads users, filters/sorts/paginates them, and opens user modal for CRUD actions. Dependencies: React, toast. Depends on: `UserModal.jsx`, shared API/cache helpers. Imported by: `App.jsx`.
- `client/src/pages/admin/BulkUpload.jsx`: Purpose: bulk user import route. Logic: parses CSVs, validates headers, sequentially creates users via API, and exports generated credentials CSV. Dependencies: React, `papaparse`, toast. Depends on: shared API helpers. Imported by: `App.jsx`.
- `client/src/pages/admin/ClassroomManagement.jsx`: Purpose: admin classroom management route. Logic: creates single/bulk classroom networks, assigns teachers/subjects, deletes classrooms or full course networks, and caches results. Dependencies: React, toast. Depends on: shared API/cache helpers. Imported by: `App.jsx`.
- `client/src/pages/admin/ServerLogs.jsx`: Purpose: admin server-log route. Logic: paginates and filters audit logs with refresh behavior. Dependencies: React. Depends on: shared API/cache helpers. Imported by: `App.jsx`.
- `client/src/pages/admin/AdminAnnouncements.jsx`: Purpose: admin university-announcement route. Logic: uploads optional attachment, posts campus announcements, and shows recent posts. Dependencies: React, toast. Depends on: `university.service.js`, upload helper, Cloudinary URL helper. Imported by: `App.jsx`.
- `client/src/pages/admin/AdminCalendar.jsx`: Purpose: admin calendar route placeholder. Logic: displays “Coming soon” only. Dependencies: React. Depends on: none. Imported by: `App.jsx`.

### 9.12 Frontend shared feature components

- `client/src/components/ProtectedRoute.jsx`: Purpose: route guard. Logic: waits for auth loading, redirects unauthenticated/wrong-role users, shows skeleton while loading. Dependencies: React Router. Depends on: `AuthContext.jsx`, `LayoutSkeleton.jsx`. Imported by: `App.jsx`.
- `client/src/components/ServerWakeupModal.jsx`: Purpose: backend warm-up overlay. Logic: shows loading state while waiting for sleeping backend to become reachable. Dependencies: React. Depends on: `LayoutSkeleton.jsx`. Imported by: `main.jsx`.
- `client/src/components/SocketManager.jsx`: Purpose: global user socket bootstrap. Logic: joins user room, handles online-user and friend-event side effects, plays notifications/toasts. Dependencies: React, toast. Depends on: auth/chat context, socket singleton. Imported by: `App.jsx`.
- `client/src/components/Notifications.jsx`: Purpose: notifications UI. Logic: loads persisted notifications and friend requests, groups assignment activity, listens to socket events, supports accept/decline/open-chat actions. Dependencies: React, toast, routing. Depends on: auth/home contexts, shared API/cache/socket services. Imported by: student/teacher notification pages.
- `client/src/components/Calender.jsx`: Purpose: rich calendar/timetable UI. Logic: fetches current calendar/timetable/todos, shows monthly event grid, image-based academic calendar, zoom/export features, and PDF/XLSX generation. Dependencies: React, `jspdf`. Depends on: auth/home contexts, `apiClient.js`, page cache, modal/loading/excel/cloudinary helpers. Imported by: student/teacher calendar pages.
- `client/src/components/Whiteboard.jsx`: Purpose: Excalidraw-based sketch board. Logic: loads/saves scene to backend, enforces size limit, supports local file view, PNG/export, toolbar customization, and autosave debounce. Dependencies: React, `@excalidraw/excalidraw`. Depends on: auth context, Firebase, `sketch.service.js`. Imported by: student/teacher sketch pages.
- `client/src/components/Profile.jsx`: Purpose: profile/settings UI. Logic: shows profile card, settings sections, theme/banner/avatar editing, password modal, feature unlocks, and profile update API calls. Dependencies: React, toast. Depends on: auth context, modal/profile/feature helpers, `apiClient.js`. Imported by: student/teacher profile pages.
- `client/src/components/ProfileCard.jsx`: Purpose: profile preview card. Logic: purely presents user/profile visuals. Dependencies: React. Depends on: none. Imported by: `Profile.jsx`, `ChatProfileModal.jsx`.
- `client/src/components/OnboardingModal.jsx`: Purpose: onboarding wrapper. Logic: composes change-password and update-email flows when initial account setup is incomplete. Dependencies: React. Depends on: auth context and onboarding modals. Imported by: none current direct route; reusable component.
- `client/src/components/ChangePasswordModal.jsx`: Purpose: password-reset modal. Logic: updates Firebase password and onboarding flags, clears session state after success. Dependencies: React, Firebase, toast. Depends on: Firebase init, `session.service.js`. Imported by: login, navbar, profile, layouts, onboarding.
- `client/src/components/UpdateEmailModal.jsx`: Purpose: email-update modal. Logic: updates Firebase/email-verification related flags and resets session state as needed. Dependencies: React, Firebase, toast. Depends on: Firebase init, `session.service.js`. Imported by: login, layouts, onboarding.
- `client/src/components/SharedNoteBubble.jsx`: Purpose: note-preview chat bubble. Logic: renders markdown shared-note payload and note actions. Dependencies: React, markdown libs. Depends on: `LightbulbIcon.jsx`, `useNotes.js`. Imported by: official channel and generic message renderer.
- `client/src/components/FeatureList.jsx`: Purpose: credits/feature list. Logic: lists hidden feature entries and click targets for easter-egg overlay. Dependencies: React. Depends on: `feature.constants.js`. Imported by: `Profile.jsx`.
- `client/src/components/FeatureEventOverlay.jsx`: Purpose: easter-egg event overlay. Logic: full-screen feature animation/modal controlled by props. Dependencies: React. Depends on: none local. Imported by: `Profile.jsx`.

### 9.13 Frontend admin components

- `client/src/components/admin/AdminEditProfileModal.jsx`: Purpose: admin profile editor. Logic: edits admin display name/avatar/banner color through backend API. Dependencies: React. Depends on: modal, auth context, `apiClient.js`, avatar utils. Imported by: `Navbar.jsx`.
- `client/src/components/admin/UserModal.jsx`: Purpose: admin user create/edit modal. Logic: handles form state, validation, and API calls for user CRUD. Dependencies: React, toast. Depends on: `apiClient.js`. Imported by: `UserManagement.jsx`.

### 9.14 Frontend bot components

- `client/src/components/bot_comps/BotMain.jsx`: Purpose: AI chat UI. Logic: stores prompt/result history, renders markdown answers, loads cached history, and sends bot requests to backend. Dependencies: React, markdown libs. Depends on: auth context, loading state, shared API/cache services. Imported by: student/teacher bot pages.

### 9.15 Frontend chat components

- `client/src/components/chat_comps/ChatMain.jsx`: Purpose: top-level DM/teacher-chat UI. Logic: selects chats, loads message history, handles auto-open from route state, opens doubt modal, deletes messages, handles friend/unfriend flows. Dependencies: React, Axios, toast, routing. Depends on: chat context, auth context, Firebase, socket service, chat subcomponents. Imported by: student/teacher community chat pages.
- `client/src/components/chat_comps/ChatSidebar.jsx`: Purpose: chat list/sidebar. Logic: shows peer chats, teacher chats, add-chat flow, unread indicators, and active selection. Dependencies: React. Depends on: chat context, avatar utils, loading UI, `AddChat.jsx`. Imported by: `ChatMain.jsx`.
- `client/src/components/chat_comps/ChatWindow.jsx`: Purpose: active DM window. Logic: renders messages, typing state, attachment picker, assignment modal, profanity checks, infinite older-message loading, and send/delete actions. Dependencies: React, Axios, toast. Depends on: message/item components, chat media picker, attachment upload helper, socket service, chat context. Imported by: `ChatMain.jsx`.
- `client/src/components/chat_comps/AddChat.jsx`: Purpose: create/find chat modal. Logic: searches classmates/users, creates DMs, and triggers open-chat flow. Dependencies: React, Axios, toast. Depends on: auth/chat contexts, Firebase, socket service, avatar utils. Imported by: `ChatSidebar.jsx`.
- `client/src/components/chat_comps/ChatProfileModal.jsx`: Purpose: chat-profile popup. Logic: shows a selected user's profile card and loading state. Dependencies: React, Axios. Depends on: modal, profile card, Firebase, exported backend `server`. Imported by: `ChatMain.jsx`.
- `client/src/components/chat_comps/ChatMediaPicker.jsx`: Purpose: GIF picker. Logic: searches GIPHY and returns selected GIFs to parent chat inputs. Dependencies: React, GIPHY packages. Depends on: chat constants. Imported by: chat, community, and group chat windows.
- `client/src/components/chat_comps/AssignmentModal.jsx`: Purpose: assignment detail/submit modal inside chat. Logic: shows assignment info, doubts tab, submission form, attachment upload, and submit actions. Dependencies: React, portals, upload helpers. Depends on: loading state and `attachmentUpload.js`. Imported by: `ChatWindow.jsx`.
- `client/src/components/chat_comps/AssignmentMessageCard.jsx`: Purpose: assignment-message renderer. Logic: formats assignment messages differently from normal chat messages. Dependencies: React. Depends on: none. Imported by: `MessageItem.jsx`.

### 9.16 Frontend community components

- `client/src/components/community_comps/CommunityMain.jsx`: Purpose: classroom/community container. Logic: switches between official channel and student hub, opens room info, manages doubts/comments and role-specific classroom views. Dependencies: React, Axios. Depends on: auth/chat/community contexts, socket service, official/student subcomponents, room modal. Imported by: student/teacher classroom pages.
- `client/src/components/community_comps/OfficialChannel.jsx`: Purpose: official classroom stream. Logic: renders teacher announcements, shared notes/files, media previews, attachment upload, and posting tools. Dependencies: React, Axios, toast. Depends on: community context, image preview, chat media picker, attachment/cloudinary helpers. Imported by: `CommunityMain.jsx`.
- `client/src/components/community_comps/StudentHub.jsx`: Purpose: unofficial/student hub chat. Logic: renders community chat messages, media picker, attachment uploads, typing, and message send flow. Dependencies: React, Axios, toast. Depends on: socket service, message renderer, chat constants, attachment helper. Imported by: `CommunityMain.jsx`.
- `client/src/components/community_comps/ClassRoomInfoModal.jsx`: Purpose: classroom info popup. Logic: lists participants/teachers/subject info for the current classroom. Dependencies: React, Axios. Depends on: modal, loading UI, user-list item, avatar utils. Imported by: `CommunityMain.jsx`.
- `client/src/components/community_comps/TeacherClassList.jsx`: Purpose: teacher classroom list. Logic: presentational selector for teacher-assigned classes. Dependencies: React. Depends on: none. Imported by: `CommunityMain.jsx`.

### 9.17 Frontend group components

- `client/src/components/group_comps/GroupsMain.jsx`: Purpose: project-group workspace. Logic: shows group list, opens selected group chat, opens group creation/info dialogs. Dependencies: React. Depends on: project context, chat context, group subcomponents. Imported by: student/teacher group pages.
- `client/src/components/group_comps/GroupChatWindow.jsx`: Purpose: active project-group chat window. Logic: renders messages, attachments, media/GIF, profanity checks, and socket interactions for group chat. Dependencies: React, Axios, toast. Depends on: project context, auth context, socket service, message/item helpers, upload helper. Imported by: `GroupsMain.jsx`.
- `client/src/components/group_comps/CreateGroupModal.jsx`: Purpose: group creation modal. Logic: selects users, sets name/goal/deadline, and creates group via backend. Dependencies: React, Axios, toast. Depends on: modal, auth/chat contexts, avatar utils, Firebase. Imported by: `GroupsMain.jsx`.
- `client/src/components/group_comps/GroupInfoModal.jsx`: Purpose: group details modal. Logic: shows members/admin/deadline and supports membership/admin actions. Dependencies: React, Axios, toast. Depends on: modal, auth context, user-list item, avatar utils, Firebase. Imported by: `GroupsMain.jsx`.

### 9.18 Frontend notes components

- `client/src/components/notecomps/Notes.jsx`: Purpose: notes workspace. Logic: lists notes, handles create/edit/delete/share flows, markdown preview, and route-aware state. Dependencies: React, toast, markdown libs, routing. Depends on: note subcomponents, `useNotes.js`, loading state. Imported by: student/teacher note pages.
- `client/src/components/notecomps/CreateNote.jsx`: Purpose: note editor modal. Logic: manages create/edit form and portal rendering. Dependencies: React, portals, toast. Depends on: none local. Imported by: `Notes.jsx`.
- `client/src/components/notecomps/NoteCard.jsx`: Purpose: note renderer/card. Logic: displays markdown note content and actions. Dependencies: React, portals, markdown libs, toast. Depends on: none local. Imported by: `Notes.jsx`.
- `client/src/components/notecomps/ShareNoteModal.jsx`: Purpose: note-share dialog. Logic: chooses target chats and emits shared-note messages. Dependencies: React, toast. Depends on: auth/chat contexts, Firebase, socket service, avatar utils. Imported by: `Notes.jsx`.
- `client/src/components/notecomps/MarkdownHelp.jsx`: Purpose: markdown help dialog. Logic: explains markdown syntax via portal. Dependencies: React, portals. Depends on: none local. Imported by: `Notes.jsx`.

### 9.19 Frontend todo components

- `client/src/components/todocomps/Todos.jsx`: Purpose: todo workspace. Logic: displays list, filters/status, and opens add/edit/delete modals. Dependencies: React, routing. Depends on: `useTodos.js`, `TodoModal.jsx`, `ConfirmDeleteModal.jsx`. Imported by: student/teacher todo pages.
- `client/src/components/todocomps/TodoModal.jsx`: Purpose: todo create/edit modal. Logic: manages title/description/date form using `react-datepicker`. Dependencies: React, `react-datepicker`. Depends on: `Modal.jsx`. Imported by: `Todos.jsx`.
- `client/src/components/todocomps/ConfirmDeleteModal.jsx`: Purpose: delete confirmation modal. Logic: simple confirm/cancel wrapper. Dependencies: React. Depends on: `Modal.jsx`. Imported by: `Todos.jsx`.
- `client/src/components/todocomps/datepicker-custom.css`: Purpose: datepicker styling. Logic: customizes `react-datepicker` appearance. Dependencies: CSS build pipeline. Depends on: none. Imported by: todo/assignment datepicker users.

### 9.20 Frontend doc/study-material components

- `client/src/components/doccomps/doclayout.jsx`: Purpose: document-layout wrapper. Logic: passes classroom/subject/upload props into the actual list component. Dependencies: React. Depends on: `doclist.jsx`. Imported by: student study materials and teacher upload pages.
- `client/src/components/doccomps/doclist.jsx`: Purpose: document list view. Logic: renders subject/class header, doc cards, and teacher-only upload tile. Dependencies: React. Depends on: `doccard.jsx`, `uploaddoc.jsx`. Imported by: `doclayout.jsx`.
- `client/src/components/doccomps/doccard.jsx`: Purpose: document card. Logic: displays file metadata, rename/delete controls, and opens preview viewer. Dependencies: React. Depends on: `docviewer.jsx`, Cloudinary URL helper. Imported by: `doclist.jsx`.
- `client/src/components/doccomps/docviewer.jsx`: Purpose: document preview modal. Logic: previews PDFs/images and attachment metadata in a reusable viewer. Dependencies: React. Depends on: modal/loading/image preview helpers and Cloudinary URL helper. Imported by: doc cards, home announcements, teacher assignment page, message renderer.
- `client/src/components/doccomps/uploaddoc.jsx`: Purpose: teacher upload tile. Logic: validates selected file type, collects display name, and calls parent upload callback. Dependencies: React. Depends on: none. Imported by: `doclist.jsx`.
- `client/src/components/doccomps/subjectgrid.jsx`: Purpose: unused placeholder subject selector. Logic: renders static mock class/subject cards and `onSelect` callback. Dependencies: React. Depends on: none. Imported by: none.
- `client/src/components/doccomps/index.js`: Purpose: unused barrel placeholder. Logic: currently exports nothing meaningful. Dependencies: none. Depends on: none. Imported by: none.

### 9.21 Frontend shared/common UI components

- `client/src/components/shared/MessageItem.jsx`: Purpose: generic message renderer. Logic: switches among text, shared note, assignment message, document preview, and attachment/image rendering for chat-like UIs. Dependencies: React. Depends on: shared note bubble, assignment card, doc viewer, image preview, avatar/cloudinary helpers. Imported by: chat, student hub, and group chat windows.
- `client/src/components/shared/DoubtModal.jsx`: Purpose: reusable doubt/comment modal. Logic: renders doubt list and reply input used across chat/community flows. Dependencies: React. Depends on: `CommentThread.jsx`. Imported by: `ChatMain.jsx`, `CommunityMain.jsx`.
- `client/src/components/shared/CommentThread.jsx`: Purpose: threaded comment renderer. Logic: recursively/presentationally shows comment author, content, and nested replies. Dependencies: React. Depends on: avatar utils. Imported by: `DoubtModal.jsx`.
- `client/src/components/shared/UserListItem.jsx`: Purpose: user row renderer. Logic: reusable participant list item. Dependencies: React. Depends on: avatar utils. Imported by: classroom/group info and selection modals.
- `client/src/components/shared/LightbulbIcon.jsx`: Purpose: decorative icon component. Logic: shared icon for notes/ideas UI. Dependencies: React. Depends on: none. Imported by: message item and shared-note bubble.
- `client/src/components/shared/home_widgets/WelcomeCard.jsx`: Purpose: home welcome card. Logic: displays greeting/profile summary and loading state. Dependencies: React. Depends on: `LoadingState.jsx`. Imported by: student/teacher home pages.
- `client/src/components/shared/home_widgets/QuickTodosWidget.jsx`: Purpose: dashboard todo preview. Logic: compact todo snapshot widget; mostly presentational. Dependencies: React. Depends on: none. Imported by: student/teacher home pages.
- `client/src/components/shared/home_widgets/NotificationsWidget.jsx`: Purpose: dashboard notification preview. Logic: compact notification summary widget. Dependencies: React. Depends on: none. Imported by: student/teacher home pages.
- `client/src/components/shared/home_widgets/EventWidget.jsx`: Purpose: dashboard event preview. Logic: compact calendar/timetable/upcoming-event card. Dependencies: React. Depends on: `LoadingState.jsx`. Imported by: student/teacher home pages.
- `client/src/components/shared/home_widgets/AnnouncementsWidget.jsx`: Purpose: dashboard university-announcement preview. Logic: shows recent university announcements and preview modal for attachments. Dependencies: React. Depends on: doc viewer, image preview, modal, cloudinary helper. Imported by: student/teacher home pages.

### 9.22 Frontend generic UI primitives

- `client/src/components/ui/Navbar.jsx`: Purpose: top navigation/header. Logic: renders role-aware home/community tabs, admin profile dropdown, logout, and password/profile modals. Dependencies: React, routing, Firebase auth. Depends on: auth context, session service, admin/profile modals. Imported by: all layouts.
- `client/src/components/ui/Breadcrumb.jsx`: Purpose: breadcrumb bar. Logic: derives current breadcrumb trail from route config. Dependencies: React Router. Depends on: `config/breadcrumbs.js`. Imported by: student/teacher layouts.
- `client/src/components/ui/Modal.jsx`: Purpose: generic portal modal. Logic: handles portal rendering, body lock, escape key, and backdrop. Dependencies: React, portals. Depends on: none. Imported by: many dialogs.
- `client/src/components/ui/LoadingState.jsx`: Purpose: shared loading indicator. Logic: chooses loading text/animation size and style. Dependencies: React. Depends on: `loadingMessages.js`. Imported by: many screens/components.
- `client/src/components/ui/LayoutSkeleton.jsx`: Purpose: skeleton placeholder. Logic: generic app-shell loading layout. Dependencies: React. Depends on: none. Imported by: protected route and server wakeup modal.
- `client/src/components/ui/ImagePreviewModal.jsx`: Purpose: image lightbox. Logic: previews image attachments in a modal. Dependencies: React. Depends on: `Modal.jsx`. Imported by: docs/messages/community/home pages.
- `client/src/components/ui/Avatar.jsx`: Purpose: avatar primitive. Logic: resolves/fallbacks avatar display. Dependencies: React. Depends on: none. Imported by: `GroupAvatarStack.jsx`.
- `client/src/components/ui/GroupAvatarStack.jsx`: Purpose: stacked avatar display. Logic: shows multiple participant avatars in compact overlapping form. Dependencies: React. Depends on: `Avatar.jsx`. Imported by: reusable UI only.

---

## 10. Final Exam Takeaways

If the examiner asks for the “most important files,” mention these first:

- Frontend entry: `client/src/main.jsx`
- Frontend routes/providers: `client/src/App.jsx`
- Auth state: `client/src/context/AuthContext.jsx`
- Realtime chat state: `client/src/context/ChatProvider.jsx`
- Classroom/community state: `client/src/context/CommunityContext.jsx`
- Backend entry: `server/index.js`
- Auth middleware: `server/middleware/auth.js`
- Main business modules:
  - `server/services/chat.service.js`
  - `server/services/assignment.service.js`
  - `server/services/classroom.service.js`
  - `server/services/admin.service.js`
  - `server/services/uploads.service.js`
  - `server/services/socket.service.js`

If the examiner asks for Docker, the key answer is:

> Docker packages the backend together with LibreOffice so document preview conversion works reliably in deployment. There is only a backend Dockerfile; there is no docker-compose orchestration file in this repo.

If the examiner asks for project style, the key answer is:

> It is a modular layered full-stack architecture: React pages/components/contexts on the frontend, and Express routes/controllers/services/models on the backend.

