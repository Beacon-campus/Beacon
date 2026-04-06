# SECURITY_ANALYSIS

## Scope

This audit is based only on code present in this repository. I reviewed:

- `server/` backend code, middleware, routes, controllers, services, models, env examples, and Dockerfile
- `client/` frontend auth, API, rendering, upload, and session-handling code
- dependency manifests and local `npm audit --json` results for both `server` and `client`

### Important limitations

- Firebase Security Rules are not present in this repo, so Firestore-side access control cannot be verified.
- Reverse proxy / TLS termination configuration is not present, so HTTPS enforcement outside the app cannot be verified.
- No `docker-compose.yml` was found.

---

## Executive Summary

### Strong points already implemented

- Firebase ID token authentication is enforced on most API routes.
- Admin routes use centralized RBAC middleware.
- Several assignment, study-material, note, todo, and friend flows contain meaningful role or ownership checks.
- Helmet, CORS, rate limiting, proxy awareness, and global error handling are enabled in the backend.
- File uploads enforce MIME allowlists, size limits, filename sanitization, and Cloudinary path scoping.
- Secrets are externalized through environment variables rather than hardcoded in source.

### Most serious confirmed security issues

1. Socket.IO has no authentication middleware and trusts client-supplied identity fields.
2. Multiple chat and classroom endpoints lack resource-level authorization checks, creating IDOR risk.
3. Uploaded files are stored with public Cloudinary access and the API returns public `secure_url` values directly.
4. Temporary passwords are generated in plaintext, stored in Firestore, and returned by admin APIs.
5. Note export builds HTML with `marked.parse(...)` and injects it using `innerHTML`, creating an XSS path.

---

## 1. Implemented Security Mechanisms

## 1.1 Authentication: Firebase Bearer Token Verification

### A. What It Is

Bearer-token authentication means the client sends a token with each protected request, and the server verifies that token before allowing access.

### B. Where It Is Implemented

- `server/middleware/auth.js:3-20`
- `server/routes/auth.route.js:8-11`
- Many other route files call `verifyFirebaseToken`
- `client/src/services/apiClient.js:14-20`

#### Code snippet

```js
// server/middleware/auth.js
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return res.status(401).json({ error: "Missing or invalid Authorization header" });
}

const token = authHeader.split("Bearer ")[1];
const decodedToken = await admin.auth().verifyIdToken(token);
req.user = decodedToken;
```

```js
// client/src/services/apiClient.js
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken();
  config.headers.Authorization = `Bearer ${token}`;
}
```

### C. How It Works

- The frontend fetches a Firebase ID token from the signed-in user.
- The token is attached to the `Authorization` header.
- The backend verifies the token using Firebase Admin SDK.
- On success, decoded claims are attached to `req.user`.

### D. Why It Is Important

It blocks unauthenticated access to protected routes and ties requests to a verified Firebase identity.

---

## 1.2 Authorization: Route-Level RBAC for Admin APIs

### A. What It Is

Authorization decides what an authenticated user is allowed to do. RBAC restricts actions by role such as `admin`, `teacher`, or `student`.

### B. Where It Is Implemented

- `server/routes/admin.route.js:24-42`
- `server/controllers/admin.controller.js:25-38`

#### Code snippet

```js
// server/routes/admin.route.js
router.use(verifyFirebaseToken);
router.use(verifyAdminRole);
```

```js
// server/controllers/admin.controller.js
const mongoUser = await getMongoUserByFirebaseUid(uid);
if (!mongoUser || mongoUser.role !== "admin") {
  return res.status(403).json({ error: "Access denied: Admin role required." });
}
```

### C. How It Works

- Every `/api/admin/*` request must first pass token verification.
- Then the backend loads the corresponding MongoDB user and checks `role === "admin"`.
- Only then are admin endpoints executed.

### D. Why It Is Important

It prevents ordinary users from reaching user-management, classroom-management, dashboard, and log endpoints.

---

## 1.3 Authorization: Role and Ownership Checks in Business Logic

### A. What It Is

This is object-level authorization: even after authentication, the server checks whether the user owns the record or has the right role for the resource.

### B. Where It Is Implemented

- Notes ownership: `server/services/notes.service.js:8-16`
- Todos ownership: `server/services/todos.service.js:12-34`
- Assignment owner / classroom membership checks: `server/controllers/assignment.controller.js` (multiple role checks)
- Study-material teacher assignment checks: `server/controllers/classroom.controller.js:142-147`, `249-254`, `302-307`
- Friend restrictions: `server/controllers/friends.controller.js` via role checks found in codebase

#### Code snippet

```js
// server/services/notes.service.js
return await Note.findOneAndUpdate(
  { _id: id, userId: uid },
  { $set: updates },
  { returnDocument: 'after' }
);
```

```js
// server/controllers/classroom.controller.js
if (me.role === "teacher") {
  const isAssigned = (subject.teacherIds || []).some((tid) => String(tid) === String(me._id));
  if (!isAssigned) {
    return res.status(403).json({ error: "You are not assigned to this subject" });
  }
}
```

### C. How It Works

- Notes and todos are filtered by the current user’s UID when updating or deleting.
- Assignment flows check whether a student belongs to the classroom or whether a teacher owns the assignment.
- Study material upload/rename/delete checks whether the teacher is assigned to that subject.

### D. Why It Is Important

It reduces unauthorized modification of other users’ records and limits sensitive workflows to their intended actors.

---

## 1.4 Password Handling and Account Onboarding

### A. What It Is

Password handling covers how passwords are created, reset, verified, and changed. In this project, authentication is delegated to Firebase rather than local password hashes.

### B. Where It Is Implemented

- Temporary account creation: `server/controllers/admin.controller.js:121-162`
- Onboarding and login persistence: `client/src/pages/Login.jsx:176-243`
- Email update / verification: `client/src/components/UpdateEmailModal.jsx`
- Password change flow: `client/src/components/ChangePasswordModal.jsx`
- User model has no password hash field: `server/models/User.js:3-47`

### C. How It Works

- Server-created users are provisioned in Firebase Auth.
- Login uses Firebase Auth methods like `signInWithEmailAndPassword`.
- Password reset uses Firebase email reset.
- The backend does not hash passwords locally because it does not store them locally.

### D. Why It Is Important

Delegating password verification to Firebase avoids insecure custom password verification logic. However, this repo still has a serious plaintext temporary-password issue, covered later in the missing-practices section.

---

## 1.5 Input Validation and File Sanitization

### A. What It Is

Input validation checks that incoming data matches expected type, size, and format. Sanitization removes dangerous characters from values like filenames.

### B. Where It Is Implemented

- File validation and sanitization: `server/controllers/uploads.controller.js:21-73`
- Allowed MIME types and size limits: `server/services/uploads.service.js:15-43`
- Filename sanitization: `server/services/uploads.service.js:135-140`
- Numeric / required field validation in several controllers, e.g. `server/controllers/auth.controller.js:15-20`, `server/controllers/admin.controller.js:82-84`, `server/controllers/classroom.controller.js:132-146`

#### Code snippet

```js
// server/controllers/uploads.controller.js
if (!ALLOWED_MIME_TYPES.has(fileType)) {
  return res.status(400).json({ error: "Unsupported file type" });
}

if (sizeNum > MAX_ATTACHMENT_SIZE_BYTES) {
  return res.status(400).json({ error: `File too large...` });
}

const parsed = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
if (dataUrlType !== fileType) {
  return res.status(400).json({ error: "File type mismatch" });
}
```

```js
// server/services/uploads.service.js
const base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
```

### C. How It Works

- Uploads are only accepted if MIME type is explicitly allowlisted.
- File size is checked before and after decoding base64.
- Filename characters are restricted to a safe subset.
- Several controllers also trim strings and bound limits.

### D. Why It Is Important

It helps prevent malicious uploads, path abuse, malformed payloads, and accidental oversized requests.

---

## 1.6 Security Headers with Helmet

### A. What It Is

Helmet sets standard HTTP security headers such as CSP-related headers and other browser protections.

### B. Where It Is Implemented

- `server/index.js:107-119`

#### Code snippet

```js
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "frame-ancestors": frameAncestors,
      },
    },
  })
);
```

### C. How It Works

- Helmet is globally applied to Express.
- CSP `frame-ancestors` is restricted to the API origin and configured frontend origins.
- Helmet defaults also enable common protections unless overridden.

### D. Why It Is Important

It reduces browser-side attack surface such as clickjacking and unsafe embedding behavior.

---

## 1.7 CORS Configuration

### A. What It Is

CORS controls which browser origins are allowed to call the API.

### B. Where It Is Implemented

- `server/index.js:95-126`

#### Code snippet

```js
const allowedOrigins = String(process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

### C. How It Works

- Allowed origins are read from environment variables.
- Only the listed origins may make credentialed browser requests.
- Allowed methods and headers are explicitly declared.

### D. Why It Is Important

It helps prevent untrusted browser origins from using the API with the user’s browser context.

---

## 1.8 Rate Limiting / Abuse Throttling

### A. What It Is

Rate limiting restricts how many requests a client can make in a time window to reduce abuse.

### B. Where It Is Implemented

- `server/index.js:135-153`

#### Code snippet

```js
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api/login-lookup", strictLimiter);
app.use("/api/bot/chat", strictLimiter);
```

### C. How It Works

- Public or abuse-prone endpoints get stricter limits.
- General API groups get a higher relaxed limit.
- Standard rate-limit headers are enabled.

### D. Why It Is Important

It slows brute-force, enumeration, and bot abuse attempts.

---

## 1.9 Environment Variable Usage

### A. What It Is

Environment variables keep secrets and deployment-specific configuration out of source code.

### B. Where It Is Implemented

- `server/.env.example:1-25`
- `client/.env.example:1-8`
- `server/index.js:41-53`

#### Code snippet

```env
MONGO_URI=
GOOGLE_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_PRIVATE_KEY=
```

### C. How It Works

- Backend secrets such as Mongo, Cloudinary, Gemini, and Firebase credentials are expected at runtime from env vars.
- Frontend public config uses `VITE_*` variables.

### D. Why It Is Important

It avoids hardcoding secrets in the repository and supports safer deployment workflows.

---

## 1.10 Error Handling and Controlled Stack Exposure

### A. What It Is

Centralized error handling standardizes API failures and prevents accidental stack leakage in production.

### B. Where It Is Implemented

- `server/middleware/error.middleware.js:1-20`
- Mounted in `server/index.js:201-203`

#### Code snippet

```js
res.status(statusCode).json({
  success: false,
  error: message,
  ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
});
```

### C. How It Works

- Errors are logged server-side.
- Clients receive a normalized JSON error.
- Stack traces are only returned in development mode.

### D. Why It Is Important

It reduces production information leakage and makes failures easier to handle consistently.

---

## 1.11 Audit Logging

### A. What It Is

Audit logging records important security or operational events such as logins, uploads, and admin actions.

### B. Where It Is Implemented

- `server/services/logs.service.js:46-75`
- Auth logging: `server/controllers/auth.controller.js:38-53`
- Upload logging: `server/controllers/uploads.controller.js:156-177`
- Study material logging: `server/controllers/classroom.controller.js:175-191`

#### Code snippet

```js
return createLogEntry({
  ...payload,
  actor,
  ip: payload.ip || getClientIp(req),
  userAgent: payload.userAgent || String(req.headers["user-agent"] || ""),
});
```

### C. How It Works

- The backend resolves the acting user, captures IP and user-agent, and writes structured log entries to MongoDB.
- Several sensitive workflows create success/failure logs.

### D. Why It Is Important

It supports incident investigation, traceability, and admin monitoring.

---

## 1.12 Injection Resistance: Mongoose and Safer Query Patterns

### A. What It Is

Using an ORM/ODM like Mongoose reduces some injection risk because queries are built as objects rather than raw SQL strings.

### B. Where It Is Implemented

- MongoDB access across services and models
- Pagination `ObjectId` validation in:
  - `server/services/chat.service.js:101-127`
  - `server/services/classroom.service.js:30-56`

### C. How It Works

- The code primarily uses Mongoose query builders.
- Some endpoints validate `ObjectId` values before using them in pagination filters.

### D. Why It Is Important

It lowers SQL-style injection risk. However, the project still lacks comprehensive request schema validation and Mongo-specific sanitization, so this protection is partial rather than complete.

---

## 1.13 Token Transport Choice: Authorization Header Instead of Cookies

### A. What It Is

This project uses bearer tokens in headers rather than server-issued session cookies.

### B. Where It Is Implemented

- `client/src/services/apiClient.js:14-20`
- `server/middleware/auth.js:4-15`

### C. How It Works

- Requests send `Authorization: Bearer <token>`.
- The backend verifies the token and does not rely on cookie sessions.

### D. Why It Is Important

This reduces classic cookie-based CSRF exposure. It also means secure cookie flags such as `HttpOnly`, `Secure`, and `SameSite` are not applicable here because the server does not issue auth cookies.

---

## 1.14 Partial XSS Protection from React Rendering

### A. What It Is

React escapes plain text by default, and `react-markdown` does not execute raw HTML unless explicitly configured to do so.

### B. Where It Is Implemented

- Notes rendering: `client/src/components/notecomps/NoteCard.jsx:129-133`
- Shared note rendering: `client/src/components/SharedNoteBubble.jsx`
- Bot rendering: `client/src/components/bot_comps/BotMain.jsx`

#### Code snippet

```jsx
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {note.content}
</ReactMarkdown>
```

### C. How It Works

- User note content is rendered through React components instead of raw `innerHTML`.
- No `rehypeRaw` plugin was found, so raw embedded HTML is not intentionally enabled in normal note rendering.

### D. Why It Is Important

It lowers stored-XSS risk in the main UI. However, there is still a separate XSS issue in the HTML export path discussed later.

---

## 2. Missing or Weak Security Practices

The following are confirmed gaps or weak points based on repository code.

## 2.1 Critical: Socket.IO Has No Authentication or Identity Binding

### Evidence

- Server accepts any socket connection: `server/services/socket.service.js:22-218`
- Client connects without auth metadata: `client/src/services/socket.service.js:10-13`
- Socket handlers trust client-supplied `senderId`, `firebaseUid`, `userId`, and `channelId`

#### Relevant code

```js
// client/src/services/socket.service.js
const socket = io(socketURL, {
  autoConnect: true,
  reconnection: true,
});
```

```js
// server/services/socket.service.js
socket.on("join_room", (channelId) => {
  socket.join(channelId);
});

socket.on("send_message", async (data) => {
  const channel = await Channel.findById(data.channelId);
  ...
  const newMessage = await Message.create({
    channelId: data.channelId,
    sender: data.senderId,
    text: data.text,
  });
});
```

### Risk

- Any client can join arbitrary rooms.
- A malicious client can spoof sender identity by sending someone else’s `senderId` / `firebaseUid`.
- Read receipts and presence can be forged using arbitrary `user:` rooms and `userId` values.

### Improvement

- Add Socket.IO auth middleware that verifies Firebase ID tokens during handshake.
- Derive user identity from the verified socket context only, never from client payload.
- Check channel membership before `join_room`, `send_message`, and `mark_messages_seen`.

---

## 2.2 Critical: Chat REST Endpoints Lack Resource-Level Authorization

### Evidence

- `server/controllers/chat.controller.js:232-246` fetches messages for any `channelId`
- `server/controllers/chat.controller.js:277-281` returns group details without membership check
- `server/controllers/chat.controller.js:449-467` sends messages without membership check
- `server/controllers/chat.controller.js:623-640` marks messages read without membership check
- Backing services simply query by `channelId`: `server/services/chat.service.js:38-39`, `94-127`

#### Relevant code

```js
// server/controllers/chat.controller.js
const channelExists = await getChannelById(channelId);
...
const messages = await getMessagesByChannel(channelId);
res.json(messages);
```

```js
// server/services/chat.service.js
export const getMessagesByChannel = async (channelId) => {
  return await Message.find({ channelId: channelId })
    .populate("sender", "profile.name profile.avatar firebaseUid");
};
```

### Risk

Any authenticated user who knows or guesses a `channelId` may be able to:

- read private chat history
- send messages into channels they do not belong to
- fetch group member details
- manipulate read status

### Improvement

- Before every channel action, load the channel and verify `participants` includes the current user.
- For group admin actions, require both membership and admin ownership.

---

## 2.3 High: Classroom / Community Endpoints Also Miss Object-Level Access Control

### Evidence

- `server/controllers/classroom.controller.js:322-333` gets announcements by `channelId` without membership check
- `server/controllers/classroom.controller.js:339-345` gets comments by `announcementId` without access check
- `server/controllers/classroom.controller.js:348-363` posts comments without verifying classroom access
- `server/controllers/classroom.controller.js:368-395` lets any teacher/admin post to any `channelId`
- `server/controllers/classroom.controller.js:401-412` toggles comment resolution without role or ownership check
- `server/controllers/classroom.controller.js:418-438` reads and updates classroom details without authorization
- `server/services/classroom.service.js:76-87` returns full teacher/student populations including email

#### Relevant code

```js
// server/controllers/classroom.controller.js
const classroom = await getDetailedClassroomById(id);
res.json(classroom);
```

```js
// server/services/classroom.service.js
let classroom = await Classroom.findById(id)
  .populate("subjects.teacherIds", "profile.name profile.avatar role email")
  .populate("studentIds", "profile.name profile.avatar role email");
```

### Risk

Any authenticated user may be able to read classroom rosters, teacher/student emails, comments, announcements, or edit classroom descriptions simply by using known IDs.

### Improvement

- Verify current user is an enrolled student, assigned teacher, or admin before serving classroom data.
- Restrict announcement posting to the teacher assigned to the actual classroom/subject.
- Limit exposed user fields; do not return student/teacher email unless strictly necessary.

---

## 2.4 High: Uploaded Files Are Publicly Accessible

### Evidence

- Cloudinary upload sets `access_mode: "public"`: `server/services/uploads.service.js:153-167`
- Upload API returns `secureUrl` directly: `server/controllers/uploads.controller.js:88-99`, `179-193`
- Deprecated file endpoint tells clients to use the Cloudinary URL directly: `server/controllers/uploads.controller.js:222-225`
- File preview UI embeds those URLs directly: `client/src/components/doccomps/docviewer.jsx:57-80`

#### Relevant code

```js
// server/services/uploads.service.js
access_mode: "public",
type: "upload",
```

```js
// server/controllers/uploads.controller.js
return res.status(201).json({
  cloudinary: cloudinaryMeta,
  previewUrl,
  previewDownloadUrl,
});
```

### Risk

Study materials, assignment submissions, and announcement attachments may be publicly retrievable by anyone who obtains the URL. This is especially serious for submissions and classroom documents.

### Improvement

- Store sensitive assets as private/authenticated Cloudinary resources.
- Serve downloads through an authenticated backend endpoint or signed short-lived URLs only.
- Separate public and private asset scopes.

---

## 2.5 High: Temporary Passwords Are Stored and Returned in Plaintext

### Evidence

- Generated as raw text: `server/controllers/admin.controller.js:86-88`
- Written to Firestore: `server/controllers/admin.controller.js:150-162`
- Returned in create-user response: `server/controllers/admin.controller.js:175-188`
- Returned in admin user listing when not reset: `server/controllers/admin.controller.js:50-69`

#### Relevant code

```js
const autoPassword = req.body.password || Math.random().toString(36).slice(-8);
...
temppassword: autoPassword,
```

### Risk

- Plaintext temporary passwords can be exposed to admins, logs, Firestore readers, or accidental exports.
- This increases credential theft risk and violates basic password handling principles.

### Improvement

- Do not store plaintext temporary passwords after account creation.
- Prefer password reset links or one-time onboarding links.
- If a temporary secret must exist, store only a one-way hash and expire it quickly.

---

## 2.6 High: XSS in Note HTML Export

### Evidence

- `client/src/components/notecomps/NoteCard.jsx:66-105`

#### Relevant code

```js
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
  const markdown = ${JSON.stringify(note.content || "")};
  document.getElementById('content').innerHTML = marked.parse(markdown);
</script>
```

### Risk

If note content contains malicious HTML or a crafted payload that `marked` renders unsafely, opening the exported HTML may execute attacker-controlled script in the browser.

### Improvement

- Do not use `innerHTML` for export rendering.
- Sanitize generated HTML with a maintained sanitizer before insertion.
- Prefer generating plain `.md`, PDF on a trusted backend, or a sanitized static HTML render.

---

## 2.7 Medium: Public User Enumeration Paths Exist

### Evidence

- Public route: `server/routes/auth.route.js:7`
- Backend lookup reveals existence by returning email or 404: `server/controllers/auth.controller.js:13-25`
- Client login queries Firestore by registration number directly and distinguishes `User not found` from `Wrong password`: `client/src/pages/Login.jsx:176-205`

### Risk

Attackers can confirm which registration numbers or emails exist, improving phishing and credential-stuffing attacks.

### Improvement

- Return generic responses for login discovery flows.
- Move identity lookup fully server-side and reduce detail returned.
- Consider CAPTCHA / additional throttling for discovery endpoints.

---

## 2.8 Medium: Server-Side Request Validation Is Inconsistent

### Evidence

- Good validation exists for uploads, but many controllers accept raw `req.body` and pass it straight to persistence or update logic:
  - `server/controllers/auth.controller.js:81-89`
  - `server/controllers/classroom.controller.js:434-438`
  - `server/controllers/chat.controller.js:449-467`
  - `server/services/notes.service.js:8-16`
  - `server/services/todos.service.js:12-34`

### Risk

- Unexpected fields can slip into updates.
- Business rules are enforced unevenly.
- NoSQL operator injection risk is reduced by Mongoose but not fully hardened without explicit schema validation / sanitization.

### Improvement

- Introduce request schemas using `zod`, `joi`, or `express-validator`.
- Allowlist updateable fields explicitly.
- Add Mongo sanitization for keys like `$` and `.` if user-controlled objects are accepted.

---

## 2.9 Medium: Admin Log Search Uses Raw Regex from User Input

### Evidence

- `server/services/logs.service.js:108-119`

#### Relevant code

```js
const pattern = String(search).trim();
query.$or = [
  { eventType: { $regex: pattern, $options: "i" } },
  ...
];
```

### Risk

An admin-supplied expensive regex could trigger unnecessary database work or ReDoS-like behavior.

### Improvement

- Escape regex metacharacters before building the pattern.
- Or use text indexes / exact filters instead of raw regex.

---

## 2.10 Medium: Dockerfile Runs as Root and Copies Entire Context

### Evidence

- Root user remains default: `server/Dockerfile:1-26`
- Full context copied: `server/Dockerfile:19`
- No `.dockerignore` was found in the repo

### Risk

- If the container is compromised, the process has root privileges inside the container.
- `COPY . .` can accidentally include sensitive local files in the image if present, such as `serviceAccountKey.json`.

### Improvement

- Create and switch to a non-root `USER`.
- Add a `.dockerignore`.
- Copy only required runtime files.

---

## 2.11 Low to Medium: HTTPS Is Expected but Not Enforced by Application Code

### Evidence

- Client example uses HTTPS API URL: `client/.env.example:2`
- Cloudinary is configured with `secure: true`: `server/services/uploads.service.js:56-63`
- No HTTP-to-HTTPS redirect or strict transport enforcement logic was found in Express app code

### Risk

If the app is deployed behind a misconfigured proxy or directly exposed over HTTP, tokens could be intercepted in transit.

### Improvement

- Enforce HTTPS at the proxy/load-balancer level.
- Optionally add redirect middleware for non-HTTPS traffic when `trust proxy` is enabled correctly.

---

## 2.12 Not Found in Repo: CSRF Protection

### Evidence

- No CSRF middleware or token generation was found.
- No cookie-based auth session is implemented.

### Risk

Current risk is lower because auth is bearer-token-based rather than cookie-session-based. However, if cookies are introduced later, CSRF will become important immediately.

### Improvement

- If the project stays header-token-only, document that design choice clearly.
- If cookies are ever added, add CSRF tokens and `SameSite` protections.

---

## 3. Dependency-Level Security

## 3.1 Security-Oriented Libraries Found

| Library | Location | Purpose | How it is used here |
|---|---|---|---|
| `firebase-admin` | server | Verify Firebase identity tokens and manage users | Verifies bearer tokens and provisions users |
| `helmet` | server | HTTP security headers | Applied globally in `server/index.js` |
| `express-rate-limit` | server | Throttle abuse | Limits login lookup, bot chat, and API groups |
| `cors` | server | Cross-origin controls | Restricts browser origins via `CLIENT_URL` |
| `mongoose` | server | ODM with safer structured queries | Used for all MongoDB persistence |
| `dotenv` | server | Secret/config loading | Used through `dotenv/config` |
| `cloudinary` | server | Hosted file storage | Used for attachments and calendar images |
| `firebase` | client | Auth and Firestore client access | Used for login, password reset, and Firestore profile flags |
| `axios` | client | HTTP client | Adds bearer tokens through an interceptor |
| `react-markdown` | client | Markdown rendering | Used for notes and bot content, which is safer than raw HTML by default |

## 3.2 Local `npm audit` Results

### Server audit result

- Total vulnerabilities: 15
- High: 6
- Moderate: 1
- Low: 8

Notable packages reported:

- `socket.io-parser` high
- `path-to-regexp` high
- `fast-xml-parser` high
- `lodash` high
- `node-forge` high
- `picomatch` high

### Client audit result

- Total vulnerabilities: 11
- Critical: 1
- High: 4
- Moderate: 6

Notable packages reported:

- `jspdf` critical
- `socket.io-parser` high
- `flatted` high
- `lodash-es` high
- `@excalidraw/excalidraw` moderate
- `mermaid` / `dompurify` moderate via transitive chain

### Interpretation

- The most urgent dependency issue on the client side is `jspdf`, because it is a direct dependency with a critical advisory.
- Socket-related advisories matter because this project uses Socket.IO in both client and server.
- Some vulnerabilities are transitive, but they still affect runtime risk and patch posture.

### Improvement

- Upgrade direct dependencies first: `jspdf`, `socket.io` ecosystem, `@excalidraw/excalidraw`, and packages that pull vulnerable parser chains.
- Re-run `npm audit` after updates and document any advisories that remain intentionally accepted.

---

## 4. Docker Security Analysis

## Files reviewed

- `server/Dockerfile`

## Positive points

- Uses `npm ci --omit=dev` for a production install.
- Uses `--no-install-recommends` during apt install.
- Clears apt package lists after installation.
- Uses runtime env vars rather than baking secrets directly in the Dockerfile.

## Weak points

- Runs as root because no `USER` is set.
- `COPY . .` copies the entire server context into the image.
- No `.dockerignore` found.
- Large LibreOffice packages increase image size and attack surface.
- No healthcheck instruction in the Dockerfile.

## Recommendation

Use a non-root runtime user, add a `.dockerignore`, minimize copied files, and consider whether LibreOffice conversion belongs in the main application container or a separate worker.

---

## 5. Overall Security Posture by Topic

| Topic | Status | Notes |
|---|---|---|
| Authentication | Implemented | Firebase bearer token auth is in place |
| Authorization | Partial | Good in some modules, missing in chat/classroom/socket object checks |
| Password hashing | Not local | Delegated to Firebase; no bcrypt/jwt/session stack found |
| Input validation | Partial | Strong for uploads, weak/inconsistent elsewhere |
| Error handling | Implemented | Central middleware exists |
| Environment variables | Implemented | `.env.example` files provided |
| API security | Partial | Auth, CORS, rate limiting exist; object-level auth gaps remain |
| CORS | Implemented | Env-driven allowlist |
| Rate limiting | Implemented | Strict and relaxed buckets |
| Helmet / headers | Implemented | Helmet with CSP customization |
| CSRF protection | Not found | Lower current risk because no cookie auth |
| XSS protection | Partial | React/ReactMarkdown help, but note export is vulnerable |
| Injection prevention | Partial | Mongoose helps, but no schema validation / mongo sanitization |
| Secure cookies | Not applicable | No auth cookies are issued |
| HTTPS enforcement | Partial / external | Expected in deployment but not enforced in app code |
| Docker hardening | Weak | Root container and no `.dockerignore` |

---

## 6. Priority Fix List

### Priority 1

- Add authenticated Socket.IO handshake using Firebase token verification.
- Enforce channel membership checks for all chat/socket read/write operations.
- Enforce classroom membership/assignment checks for classroom detail, comments, announcements, and description updates.
- Stop returning/storing plaintext temporary passwords.
- Make sensitive uploads private or signed.

### Priority 2

- Replace note export `innerHTML` flow with a sanitized renderer.
- Add request schema validation for all write endpoints.
- Escape regex in log search.
- Patch high/critical npm audit findings, especially `jspdf` and Socket.IO-related advisories.

### Priority 3

- Add Docker hardening (`USER`, `.dockerignore`, smaller image strategy).
- Consider HTTPS redirect behavior when behind a proxy.
- Add formal security tests for IDOR and socket authorization.

---

## 7. Viva Preparation

## Common Security Questions

1. What authentication mechanism does this project use?
2. How are admin-only endpoints protected?
3. Does this project store passwords in MongoDB?
4. What protections exist for file uploads?
5. How is CORS handled?
6. Is rate limiting implemented?
7. Does the backend use Helmet?
8. Are notes and todos protected against unauthorized modification?
9. What is the biggest security weakness in this project?
10. Is Socket.IO secured properly?
11. Are uploaded files private?
12. Is CSRF protection implemented?
13. How does the project reduce XSS risk?
14. What Docker security issue did you find?
15. What dependency issue is most urgent?

## Answers

### 1. What authentication mechanism does this project use?

It uses Firebase Authentication. The client gets a Firebase ID token and sends it in the `Authorization` header. The backend verifies it with Firebase Admin SDK in `server/middleware/auth.js`.

### 2. How are admin-only endpoints protected?

Admin routes first verify the Firebase token and then run `verifyAdminRole`, which loads the MongoDB user and checks that `role === "admin"`.

### 3. Does this project store passwords in MongoDB?

No normal password hash is stored in MongoDB. Authentication is delegated to Firebase. However, the current code incorrectly stores a plaintext temporary password in Firestore during onboarding.

### 4. What protections exist for file uploads?

The backend enforces MIME allowlists, size limits, base64 validation, filename sanitization, scoped object paths, and Cloudinary upload handling. The weakness is that files are uploaded as public assets.

### 5. How is CORS handled?

Allowed origins are read from `CLIENT_URL`, split into a list, and passed to the `cors` middleware with explicit methods and allowed headers.

### 6. Is rate limiting implemented?

Yes. `express-rate-limit` is used with a strict limiter for `/api/login-lookup` and `/api/bot/chat`, and a relaxed limiter for broader API groups.

### 7. Does the backend use Helmet?

Yes. Helmet is applied globally, and CSP `frame-ancestors` is configured dynamically from the allowed frontend origins.

### 8. Are notes and todos protected against unauthorized modification?

Yes, those services use owner-based queries such as `{ _id: id, userId: uid }`, so users cannot update or delete another user’s notes or todos through those endpoints.

### 9. What is the biggest security weakness in this project?

The biggest weakness is missing object-level authorization in chat, classroom, and Socket.IO flows. A valid token is often enough to access or affect resources that should require membership checks.

### 10. Is Socket.IO secured properly?

No. The socket server currently has CORS but no authentication middleware, and it trusts identity values supplied by the client. That allows room joining and message actions without strong identity binding.

### 11. Are uploaded files private?

No. The code stores uploads in Cloudinary with `access_mode: "public"` and returns the direct `secure_url`. That is not suitable for sensitive academic files.

### 12. Is CSRF protection implemented?

No CSRF middleware was found. Current risk is lower because the app uses bearer tokens rather than cookie sessions, but CSRF would become important if cookie auth is added later.

### 13. How does the project reduce XSS risk?

React escapes normal text output, and `react-markdown` is used without `rehypeRaw`, so raw HTML is not intentionally rendered in normal note views. However, the note export feature bypasses that protection and is currently vulnerable.

### 14. What Docker security issue did you find?

The server container runs as root and copies the full build context with `COPY . .`. There is also no `.dockerignore`, which increases the chance of accidentally baking sensitive files into the image.

### 15. What dependency issue is most urgent?

The most urgent direct dependency issue is the client-side `jspdf` critical advisory. Socket.IO-related advisories are also important because this app actively uses real-time messaging.

---

## Final Assessment

This project has a solid baseline security foundation for authentication, headers, CORS, rate limiting, and some ownership checks. The main weakness is not the absence of security libraries, but inconsistent authorization enforcement around chat, classroom, socket, and file-access flows. Fixing object-level authorization, private file handling, plaintext temporary-password exposure, and the note export XSS path would significantly improve the overall security posture.
