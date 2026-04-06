# Dependency Import Inventory

This appendix records the exact import/require statements found by scanning the project source/config files (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`) under `client/` and `server/`.

Notes:

- If a package says **no import/require matches**, no direct source import was found.
- Some build-time packages are still used indirectly:
  - `autoprefixer`: referenced in `client/postcss.config.js` as `autoprefixer: {}`
  - `tailwindcss`: referenced in `client/postcss.config.js` as `tailwindcss: {}`
  - `postcss`: consumed implicitly by Vite when `client/postcss.config.js` exists
  - `nodemon`: used by the `server/package.json` script `"dev": "nodemon index.js"`
- `@excalidraw/excalidraw` has both a CSS side-effect import and a multiline named import in `client/src/components/Whiteboard.jsx`.

## client/package.json

### dependencies:@dotlottie/react-player
- `client/src/pages/Login.jsx`: `import { DotLottiePlayer } from '@dotlottie/react-player';`

### dependencies:@excalidraw/excalidraw
- `client/src/components/Whiteboard.jsx`: `import "@excalidraw/excalidraw/index.css";`
- Additional multiline import in `client/src/components/Whiteboard.jsx`:
```js
import {
  Excalidraw,
  MainMenu,
  exportToBlob,
  serializeAsJSON,
  loadFromBlob,
} from "@excalidraw/excalidraw";
```

### dependencies:@giphy/js-fetch-api
- `client/src/components/chat_comps/ChatMediaPicker.jsx`: `import { GiphyFetch } from "@giphy/js-fetch-api";`

### dependencies:@giphy/react-components
- `client/src/components/chat_comps/ChatMediaPicker.jsx`: `import { Grid } from "@giphy/react-components";`

### dependencies:axios
- `client/src/components/chat_comps/AddChat.jsx`: `import axios from "axios";`
- `client/src/components/chat_comps/ChatMain.jsx`: `import axios from "axios";`
- `client/src/components/chat_comps/ChatProfileModal.jsx`: `import axios from "axios";`
- `client/src/components/chat_comps/ChatWindow.jsx`: `import axios from "axios";`
- `client/src/components/community_comps/ClassRoomInfoModal.jsx`: `import axios from "axios";`
- `client/src/components/community_comps/CommunityMain.jsx`: `import axios from "axios";`
- `client/src/components/community_comps/OfficialChannel.jsx`: `import axios from "axios";`
- `client/src/components/group_comps/CreateGroupModal.jsx`: `import axios from "axios";`
- `client/src/components/group_comps/GroupChatWindow.jsx`: `import axios from "axios";`
- `client/src/components/group_comps/GroupInfoModal.jsx`: `import axios from "axios";`
- `client/src/context/ChatProvider.jsx`: `import axios from "axios";`
- `client/src/context/CommunityContext.jsx`: `import axios from "axios";`
- `client/src/context/ProjectContext.jsx`: `import axios from "axios";`
- `client/src/pages/Login.jsx`: `import axios from "axios";`
- `client/src/services/apiClient.js`: `import axios from "axios";`
- `client/src/utils/attachmentUpload.js`: `import axios from "axios";`

### dependencies:bad-words
- No import/require matches.

### dependencies:browser-image-compression
- `client/src/utils/attachmentUpload.js`: `import imageCompression from "browser-image-compression";`

### dependencies:exceljs
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: `import ExcelJS from "exceljs";`
- `client/src/utils/excelExport.js`: `import ExcelJS from "exceljs";`

### dependencies:file-saver
- `client/src/utils/excelExport.js`: `import { saveAs } from "file-saver";`

### dependencies:firebase
- `client/src/components/ChangePasswordModal.jsx`: `import { doc, updateDoc, deleteField } from "firebase/firestore";`
- `client/src/components/ui/Navbar.jsx`: `import { getAuth, signOut } from "firebase/auth";`
- `client/src/context/AuthContext.jsx`: `import { onAuthStateChanged } from "firebase/auth";`
- `client/src/context/AuthContext.jsx`: `import { doc, getDoc, updateDoc } from "firebase/firestore";`
- `client/src/firebase/firebase.js`: `import { initializeApp } from "firebase/app";`
- `client/src/firebase/firebase.js`: `import { getAuth, GoogleAuthProvider } from "firebase/auth";`
- `client/src/firebase/firebase.js`: `import { getFirestore } from "firebase/firestore";`

### dependencies:glob
- No import/require matches.

### dependencies:jspdf
- `client/src/components/Calender.jsx`: `import jsPDF from "jspdf";`

### dependencies:jszip
- No import/require matches.

### dependencies:lottie-react
- No import/require matches.

### dependencies:obscenity
- `client/src/utils/profanityFilter.js`: `import { RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers, DataSet, pattern } from 'obscenity';`

### dependencies:papaparse
- `client/src/pages/admin/BulkUpload.jsx`: `import Papa from "papaparse";`

### dependencies:react
- `client/src/components/admin/AdminEditProfileModal.jsx`: `import React, { useState, useMemo, useEffect } from "react";`
- `client/src/components/admin/UserModal.jsx`: `import React, { useState, useEffect } from "react";`
- `client/src/components/bot_comps/BotMain.jsx`: `import { useEffect, useRef, useState } from "react";`
- `client/src/components/Calender.jsx`: `import { useCallback, useEffect, useMemo, useState, useRef } from "react";`
- `client/src/components/ChangePasswordModal.jsx`: `import { useState } from "react";`
- `client/src/components/chat_comps/AddChat.jsx`: `import React, { useState, useEffect, useCallback } from "react";`
- `client/src/components/chat_comps/AssignmentMessageCard.jsx`: `import React from "react";`
- `client/src/components/chat_comps/AssignmentModal.jsx`: `import React, { useRef, useState } from "react";`
- `client/src/components/chat_comps/ChatMain.jsx`: `import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";`
- `client/src/components/chat_comps/ChatMediaPicker.jsx`: `import React, { useState, useEffect } from "react";`
- `client/src/components/chat_comps/ChatProfileModal.jsx`: `import React, { useState, useEffect } from "react";`
- `client/src/components/chat_comps/ChatSidebar.jsx`: `import React, { useState } from "react";`
- `client/src/components/chat_comps/ChatWindow.jsx`: `import React from "react";`
- `client/src/components/chat_comps/ChatWindow.jsx`: `import { useState, useRef, useEffect, useCallback } from "react";`
- `client/src/components/community_comps/ClassRoomInfoModal.jsx`: `import React, { useState, useEffect } from "react";`
- `client/src/components/community_comps/CommunityMain.jsx`: `import React, { useState, useEffect, useMemo, useRef } from "react";`
- `client/src/components/community_comps/OfficialChannel.jsx`: `import React, { useEffect, useState, useRef, useCallback } from "react";`
- `client/src/components/community_comps/StudentHub.jsx`: `import React, { useRef, useState, useEffect, useCallback } from "react";`
- `client/src/components/community_comps/TeacherClassList.jsx`: `import React from "react";`
- `client/src/components/doccomps/doccard.jsx`: `import { useState } from "react";`
- `client/src/components/doccomps/docviewer.jsx`: `import { useEffect, useState } from "react";`
- `client/src/components/doccomps/uploaddoc.jsx`: `import { useRef, useState } from "react";`
- `client/src/components/FeatureEventOverlay.jsx`: `import { useEffect, useRef } from "react";`
- `client/src/components/group_comps/CreateGroupModal.jsx`: `import React, { useState, useMemo, useEffect } from "react";`
- `client/src/components/group_comps/GroupChatWindow.jsx`: `import React, { useState, useEffect, useRef, useMemo } from "react";`
- `client/src/components/group_comps/GroupChatWindow.jsx`: `import { useCallback } from "react";`
- `client/src/components/group_comps/GroupInfoModal.jsx`: `import React, { useState, useEffect } from "react";`
- `client/src/components/group_comps/GroupsMain.jsx`: `import React, { useState, useMemo, useEffect, useCallback } from "react";`
- `client/src/components/notecomps/CreateNote.jsx`: `import { useState, useRef, useEffect } from "react";`
- `client/src/components/notecomps/MarkdownHelp.jsx`: `import React from 'react';`
- `client/src/components/notecomps/NoteCard.jsx`: `import { useState } from "react";`
- `client/src/components/notecomps/Notes.jsx`: `import { useState, useEffect } from "react";`
- `client/src/components/notecomps/ShareNoteModal.jsx`: `import React, { useEffect, useMemo, useState } from 'react';`
- `client/src/components/Notifications.jsx`: `import React, { useState, useEffect, useCallback } from "react";`
- `client/src/components/Profile.jsx`: `import { useState, useMemo, useEffect, useRef } from "react";`
- `client/src/components/ProfileCard.jsx`: `import React from "react";`
- `client/src/components/ServerWakeupModal.jsx`: `import { useState, useEffect } from "react";`
- `client/src/components/shared/CommentThread.jsx`: `import React from "react";`
- `client/src/components/shared/DoubtModal.jsx`: `import React from "react";`
- `client/src/components/shared/home_widgets/AnnouncementsWidget.jsx`: `import { useMemo, useState } from "react";`
- `client/src/components/shared/LightbulbIcon.jsx`: `import React from "react";`
- `client/src/components/shared/MessageItem.jsx`: `import React, { useState, useEffect, useRef } from "react";`
- `client/src/components/shared/UserListItem.jsx`: `import React from "react";`
- `client/src/components/SharedNoteBubble.jsx`: `import React, { useState } from 'react';`
- `client/src/components/SocketManager.jsx`: `import { useEffect } from "react";`
- `client/src/components/todocomps/TodoModal.jsx`: `import { useEffect, useState } from "react";`
- `client/src/components/todocomps/Todos.jsx`: `import { useState, useEffect } from "react";`
- `client/src/components/ui/Avatar.jsx`: `import React, { useMemo } from "react";`
- `client/src/components/ui/GroupAvatarStack.jsx`: `import React from "react";`
- `client/src/components/ui/ImagePreviewModal.jsx`: `import { useEffect, useState } from "react";`
- `client/src/components/ui/LayoutSkeleton.jsx`: `import React from 'react';`
- `client/src/components/ui/LoadingState.jsx`: `import { useMemo } from "react";`
- `client/src/components/ui/Modal.jsx`: `import { useEffect } from "react";`
- `client/src/components/ui/Navbar.jsx`: `import { useEffect, useState } from "react";`
- `client/src/components/UpdateEmailModal.jsx`: `import { useEffect, useState } from "react";`
- `client/src/components/Whiteboard.jsx`: `import React, { useState, useEffect, useRef, useCallback } from "react";`
- `client/src/context/AuthContext.jsx`: `import { createContext, useContext, useEffect, useRef, useState } from "react";`
- `client/src/context/ChatContext.js`: `import { createContext, useContext } from "react";`
- `client/src/context/ChatProvider.jsx`: `import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";`
- `client/src/context/CommunityContext.jsx`: `import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";`
- `client/src/context/HomeDataContext.jsx`: `import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";`
- `client/src/context/ProjectContext.jsx`: `import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";`
- `client/src/hooks/useNotes.js`: `import { useEffect } from "react";`
- `client/src/hooks/useTodos.js`: `import { useState } from "react";`
- `client/src/layouts/adminlayout/AdminLayout.jsx`: `import { useState, useEffect } from "react";`
- `client/src/layouts/studentlayout/StudentLayout.jsx`: `import { useState, useEffect } from "react";`
- `client/src/layouts/teacherlayout/TeacherLayout.jsx`: `import { useState, useEffect } from "react";`
- `client/src/pages/admin/AdminAnnouncements.jsx`: `import { useEffect, useMemo, useState } from "react";`
- `client/src/pages/admin/AdminDashboard.jsx`: `import { useEffect, useMemo, useState } from "react";`
- `client/src/pages/admin/BulkUpload.jsx`: `import React, { useState, useRef } from "react";`
- `client/src/pages/admin/ClassroomManagement.jsx`: `import React, { useState, useEffect, useMemo } from "react";`
- `client/src/pages/admin/ServerLogs.jsx`: `import { useEffect, useMemo, useState } from "react";`
- `client/src/pages/admin/UserManagement.jsx`: `import React, { useState, useEffect, useMemo } from "react";`
- `client/src/pages/Login.jsx`: `import { useEffect, useState } from "react";`
- `client/src/pages/student/student_community/QuizActive.jsx`: `import React, { useEffect, useRef, useState } from "react";`
- `client/src/pages/student/student_community/StudentClassRoom.jsx`: `import React from "react";`
- `client/src/pages/student/student_community/StudentCommunity.jsx`: `import React from "react";`
- `client/src/pages/student/student_community/StudentGroups.jsx`: `import React from "react";`
- `client/src/pages/student/student_community/StudentStudyMaterials.jsx`: `import { useEffect, useMemo, useState } from "react";`
- `client/src/pages/student/student_home/StudentHome.jsx`: `import { useEffect, useMemo, useState } from "react";`
- `client/src/pages/teacher/teacher_community/TeacherClassRooms.jsx`: `import React from "react";`
- `client/src/pages/teacher/teacher_community/TeacherCommunity.jsx`: `import React from 'react';`
- `client/src/pages/teacher/teacher_community/TeacherGroups.jsx`: `import React from "react";`
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: `import React, { useEffect, useRef, useState } from "react";`
- `client/src/pages/teacher/teacher_community/TeacherUploadStudyMaterials.jsx`: `import { useEffect, useMemo, useState } from "react";`
- `client/src/pages/teacher/teacher_home/TeacherHome.jsx`: `import { useEffect, useState } from "react";`
- `client/src/pages/teacher/teacher_home/TeacherSketch.jsx`: `import React from "react";`

### dependencies:react-datepicker
- `client/src/components/todocomps/TodoModal.jsx`: `import DatePicker from "react-datepicker";`
- `client/src/components/todocomps/TodoModal.jsx`: `import "react-datepicker/dist/react-datepicker.css"; // Import standard styles`
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: `import DatePicker from "react-datepicker";`
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: `import "react-datepicker/dist/react-datepicker.css";`

### dependencies:react-dom
- `client/src/components/chat_comps/AssignmentModal.jsx`: `import { createPortal } from "react-dom";`
- `client/src/components/notecomps/CreateNote.jsx`: `import { createPortal } from "react-dom";`
- `client/src/components/notecomps/MarkdownHelp.jsx`: `import { createPortal } from 'react-dom';`
- `client/src/components/notecomps/NoteCard.jsx`: `import { createPortal } from "react-dom";`
- `client/src/components/ui/Modal.jsx`: `import { createPortal } from "react-dom";`
- `client/src/main.jsx`: `import ReactDOM from "react-dom/client";`

### dependencies:react-hot-toast
- `client/src/App.jsx`: `import { Toaster } from "react-hot-toast";`
- `client/src/components/admin/UserModal.jsx`: `import toast from "react-hot-toast";`
- `client/src/components/ChangePasswordModal.jsx`: `import toast from "react-hot-toast";`
- `client/src/components/chat_comps/AddChat.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/chat_comps/ChatMain.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/chat_comps/ChatWindow.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/community_comps/OfficialChannel.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/community_comps/StudentHub.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/group_comps/CreateGroupModal.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/group_comps/GroupChatWindow.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/group_comps/GroupInfoModal.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/notecomps/CreateNote.jsx`: `import toast from "react-hot-toast";`
- `client/src/components/notecomps/NoteCard.jsx`: `import { toast } from 'react-hot-toast';`
- `client/src/components/notecomps/Notes.jsx`: `import toast from "react-hot-toast";`
- `client/src/components/notecomps/ShareNoteModal.jsx`: `import { toast } from 'react-hot-toast';`
- `client/src/components/Notifications.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/components/Profile.jsx`: `import toast from "react-hot-toast";`
- `client/src/components/SharedNoteBubble.jsx`: `import toast from 'react-hot-toast';`
- `client/src/components/SocketManager.jsx`: `import toast from "react-hot-toast";`
- `client/src/components/UpdateEmailModal.jsx`: `import toast from "react-hot-toast";`
- `client/src/context/HomeDataContext.jsx`: `import toast from "react-hot-toast";`
- `client/src/hooks/useNotes.js`: `import toast from "react-hot-toast";`
- `client/src/layouts/adminlayout/AdminLayout.jsx`: `import toast from "react-hot-toast";`
- `client/src/layouts/studentlayout/StudentLayout.jsx`: `import toast from "react-hot-toast";`
- `client/src/layouts/teacherlayout/TeacherLayout.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/admin/AdminAnnouncements.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/admin/AdminDashboard.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/admin/BulkUpload.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/admin/ClassroomManagement.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/admin/UserManagement.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/Login.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/student/student_community/QuizActive.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/pages/student/student_community/StudentStudyMaterials.jsx`: `import { toast } from "react-hot-toast";`
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: `import toast from "react-hot-toast";`
- `client/src/pages/teacher/teacher_community/TeacherUploadStudyMaterials.jsx`: `import { toast } from "react-hot-toast";`

### dependencies:react-markdown
- `client/src/components/bot_comps/BotMain.jsx`: `import ReactMarkdown from "react-markdown";`
- `client/src/components/notecomps/NoteCard.jsx`: `import ReactMarkdown from "react-markdown";`
- `client/src/components/notecomps/Notes.jsx`: `import ReactMarkdown from "react-markdown";`
- `client/src/components/SharedNoteBubble.jsx`: `import ReactMarkdown from 'react-markdown';`

### dependencies:react-router-dom
- `client/src/App.jsx`: `import { Routes, Route } from "react-router-dom";`
- `client/src/components/chat_comps/ChatMain.jsx`: `import { useLocation, useNavigate } from "react-router-dom";`
- `client/src/components/notecomps/Notes.jsx`: `import { useLocation } from "react-router-dom";`
- `client/src/components/Notifications.jsx`: `import { Link, useNavigate, useLocation } from "react-router-dom";`
- `client/src/components/ProtectedRoute.jsx`: `import { Navigate, useLocation } from "react-router-dom";`
- `client/src/components/todocomps/Todos.jsx`: `import { useLocation } from "react-router-dom";`
- `client/src/components/ui/Breadcrumb.jsx`: `import { useLocation } from "react-router-dom";`
- `client/src/components/ui/Navbar.jsx`: `import { Link, useLocation, useNavigate } from "react-router-dom";`
- `client/src/layouts/adminlayout/AdminLayout.jsx`: `import { Outlet, Link, Navigate, NavLink } from "react-router-dom";`
- `client/src/layouts/studentlayout/StudentLayout.jsx`: `import { Outlet, Link, useLocation, Navigate, NavLink } from "react-router-dom";`
- `client/src/layouts/teacherlayout/TeacherLayout.jsx`: `import { Outlet, Link, useLocation, Navigate, NavLink } from "react-router-dom";`
- `client/src/main.jsx`: `import { BrowserRouter } from "react-router-dom";`
- `client/src/pages/Login.jsx`: `import { useNavigate } from "react-router-dom";`
- `client/src/pages/student/student_community/QuizActive.jsx`: `import { useNavigate, useParams } from "react-router-dom";`
- `client/src/pages/student/student_home/StudentHome.jsx`: `import { useNavigate } from "react-router-dom";`
- `client/src/pages/teacher/teacher_community/TeacherPublishAssigment.jsx`: `import { useNavigate, useParams, useLocation } from "react-router-dom";`
- `client/src/pages/teacher/teacher_home/TeacherHome.jsx`: `import { useNavigate } from "react-router-dom";`

### dependencies:recharts
- No import/require matches.

### dependencies:remark-gfm
- `client/src/components/notecomps/NoteCard.jsx`: `import remarkGfm from "remark-gfm";`
- `client/src/components/notecomps/Notes.jsx`: `import remarkGfm from "remark-gfm";`
- `client/src/components/SharedNoteBubble.jsx`: `import remarkGfm from 'remark-gfm';`

### dependencies:socket.io-client
- `client/src/services/socket.service.js`: `import { io } from "socket.io-client";`

### devDependencies:@eslint/js
- `client/eslint.config.js`: `import js from '@eslint/js'`

### devDependencies:@tailwindcss/typography
- `client/tailwind.config.js`: `require('@tailwindcss/typography'),`

### devDependencies:@types/react
- No import/require matches.

### devDependencies:@types/react-dom
- No import/require matches.

### devDependencies:@vitejs/plugin-react
- `client/vite.config.js`: `import react from "@vitejs/plugin-react";`

### devDependencies:autoprefixer
- No import/require matches.
- Indirect config usage: `client/postcss.config.js` contains `autoprefixer: {},`

### devDependencies:eslint
- `client/eslint.config.js`: `import { defineConfig, globalIgnores } from 'eslint/config'`

### devDependencies:eslint-plugin-react-hooks
- `client/eslint.config.js`: `import reactHooks from 'eslint-plugin-react-hooks'`

### devDependencies:eslint-plugin-react-refresh
- `client/eslint.config.js`: `import reactRefresh from 'eslint-plugin-react-refresh'`

### devDependencies:globals
- `client/eslint.config.js`: `import globals from 'globals'`

### devDependencies:postcss
- No import/require matches.
- Indirect config usage: `client/postcss.config.js`

### devDependencies:tailwindcss
- No import/require matches.
- Indirect config usage: `client/postcss.config.js` contains `tailwindcss: {},`

### devDependencies:vite
- `client/vite.config.js`: `import { defineConfig } from "vite";`

## server/package.json

### dependencies:@google/generative-ai
- `server/services/bot.service.js`: `import { GoogleGenerativeAI } from "@google/generative-ai";`

### dependencies:cloudinary
- `server/scripts/seedUniversityAnnouncements.mjs`: `import { v2 as cloudinary } from "cloudinary";`
- `server/scripts/smokeUniversityImageAnnouncement.mjs`: `import { v2 as cloudinary } from "cloudinary";`
- `server/services/metrics.service.js`: `import { v2 as cloudinary } from "cloudinary";`
- `server/services/uploads.service.js`: `import { v2 as cloudinary } from "cloudinary";`

### dependencies:cors
- `server/index.js`: `import cors from "cors";`

### dependencies:dotenv
- `server/index.js`: `import "dotenv/config";`
- `server/scripts/migrateLegacyAttachments.mjs`: `import "dotenv/config";`
- `server/scripts/migrateUploadUrls.mjs`: `import dotenv from "dotenv";`
- `server/scripts/seedUniversityAnnouncements.mjs`: `import dotenv from "dotenv";`
- `server/scripts/smokeUniversityImageAnnouncement.mjs`: `import dotenv from "dotenv";`

### dependencies:express
- `server/index.js`: `import express from "express";`
- `server/routes/admin.route.js`: `import express from "express";`
- `server/routes/assignment.route.js`: `import express from "express";`
- `server/routes/auth.route.js`: `import express from "express";`
- `server/routes/bot.route.js`: `import express from 'express';`
- `server/routes/calendar.route.js`: `import express from "express";`
- `server/routes/chat.route.js`: `import express from "express";`
- `server/routes/classroom.route.js`: `import express from "express";`
- `server/routes/friends.route.js`: `import express from "express";`
- `server/routes/notes.route.js`: `import express from "express";`
- `server/routes/notifications.route.js`: `import express from "express";`
- `server/routes/quotes.route.js`: `import express from "express";`
- `server/routes/sketches.route.js`: `import express from "express";`
- `server/routes/timetable.route.js`: `import express from "express";`
- `server/routes/todos.route.js`: `import express from "express";`
- `server/routes/university.route.js`: `import express from "express";`
- `server/routes/uploads.route.js`: `import express from "express";`

### dependencies:express-rate-limit
- `server/index.js`: `import rateLimit from "express-rate-limit";`

### dependencies:firebase-admin
- `server/controllers/admin.controller.js`: `import admin from "firebase-admin";`
- `server/index.js`: `import admin from "firebase-admin";`
- `server/middleware/auth.js`: `import admin from "firebase-admin";`
- `server/services/admin.service.js`: `import admin from "firebase-admin";`
- `server/services/auth.service.js`: `import admin from "firebase-admin";`
- `server/services/metrics.service.js`: `import admin from "firebase-admin";`

### dependencies:helmet
- `server/index.js`: `import helmet from "helmet";`

### dependencies:libreoffice-convert
- `server/services/uploads.service.js`: `import libre from "libreoffice-convert";`

### dependencies:mongodb
- `server/scripts/auditCloudinary.mjs`: `import { MongoClient } from "mongodb";`

### dependencies:mongoose
- `server/config/db.js`: `import mongoose from 'mongoose';`
- `server/controllers/admin.controller.js`: `import mongoose from "mongoose";`
- `server/index.js`: `import mongoose from "mongoose";`
- `server/models/AcademicCalendar.js`: `import mongoose from "mongoose";`
- `server/models/Announcement.js`: `import mongoose from "mongoose";`
- `server/models/Assignment.js`: `import mongoose from "mongoose";`
- `server/models/BotSessions.js`: `import mongoose from 'mongoose';`
- `server/models/Channel.js`: `import mongoose from "mongoose";`
- `server/models/Classroom.js`: `import mongoose from "mongoose";`
- `server/models/Comment.js`: `import mongoose from "mongoose";`
- `server/models/Doubt.js`: `import mongoose from "mongoose";`
- `server/models/Log.js`: `import mongoose from "mongoose";`
- `server/models/Message.js`: `import mongoose from "mongoose";`
- `server/models/Note.js`: `import mongoose from "mongoose";`
- `server/models/Sketch.js`: `import mongoose from "mongoose";`
- `server/models/Submission.js`: `import mongoose from "mongoose";`
- `server/models/TimeTable.js`: `import mongoose from "mongoose";`
- `server/models/Todo.js`: `import mongoose from "mongoose";`
- `server/models/UniversityAnnouncement.js`: `import mongoose from "mongoose";`
- `server/models/User.js`: `import mongoose from "mongoose";`
- `server/scripts/fetchQuotes.mjs`: `import mongoose from "mongoose";`
- `server/scripts/fixTeacherFromChannel.mjs`: `import mongoose from "mongoose";`
- `server/scripts/migrateLegacyAttachments.mjs`: `import mongoose from "mongoose";`
- `server/scripts/migrateUploadUrls.mjs`: `import mongoose from "mongoose";`
- `server/scripts/seedUniversityAnnouncements.mjs`: `import mongoose from "mongoose";`
- `server/scripts/smokeUniversityImageAnnouncement.mjs`: `import mongoose from "mongoose";`
- `server/services/admin.service.js`: `import mongoose from "mongoose";`
- `server/services/chat.service.js`: `import mongoose from "mongoose";`
- `server/services/classroom.service.js`: `import mongoose from "mongoose";`
- `server/services/friends.service.js`: `import mongoose from "mongoose";`
- `server/services/metrics.service.js`: `import mongoose from "mongoose";`
- `server/services/quotes.service.js`: `import mongoose from "mongoose";`

### dependencies:p-queue
- `server/services/uploads.service.js`: `import PQueue from "p-queue";`

### dependencies:socket.io
- `server/services/socket.service.js`: `import { Server } from "socket.io";`

### devDependencies:nodemon
- No import/require matches.
- Script usage: `server/package.json` -> `"dev": "nodemon index.js"`
