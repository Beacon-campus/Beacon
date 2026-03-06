import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";

// Student
import StudentLayout from "./layouts/studentlayout/StudentLayout";
import StudentProfile from "./pages/student/StudentProfile";

// Student > Home
import StudentHome from "./pages/student/student_home/StudentHome";
import StudentTodos from "./pages/student/student_home/StudentTodos";
import StudentNotes from "./pages/student/student_home/StudentNotes";
import StudentSketch from "./pages/student/student_home/StudentSketch";
import StudentCalender from "./pages/student/student_home/StudentCalender";
import StudentStudyBot from "./pages/student/student_home/StudentStudyBot";
import StudentNotif from "./pages/student/student_home/StudentNotif";

// Student > Community
import StudentCommunity from "./pages/student/student_community/StudentCommunity";
import StudentClassRoom from "./pages/student/student_community/StudentClassRoom";
import StudentGroups from "./pages/student/student_community/StudentGroups";
import StudentStudyMaterials from "./pages/student/student_community/StudentStudyMaterials";
import QuizActive from "./pages/student/student_community/QuizActive";

// Teacher
import TeacherLayout from "./layouts/teacherlayout/TeacherLayout";
import TeacherProfile from "./pages/teacher/TeacherProfile";

// Teacher > Home
import TeacherHome from "./pages/teacher/teacher_home/TeacherHome";
import TeacherTodos from "./pages/teacher/teacher_home/TeacherTodos";
import TeacherNotes from "./pages/teacher/teacher_home/TeacherNotes";
import TeacherSketch from "./pages/teacher/teacher_home/TeacherSketch";
import TeacherCalender from "./pages/teacher/teacher_home/TeacherCalender";
import TeacherResearchBot from "./pages/teacher/teacher_home/TeacherResearchBot";
import TeacherNotif from "./pages/teacher/teacher_home/TeacherNotif";

// Teacher > Community
import TeacherCommunity from "./pages/teacher/teacher_community/TeacherCommunity";
import TeacherClassRooms from "./pages/teacher/teacher_community/TeacherClassRooms";
import TeacherGroups from "./pages/teacher/teacher_community/TeacherGroups";
import TeacherPublishAssigment from "./pages/teacher/teacher_community/TeacherPublishAssigment";
import TeacherUploadStudyMaterials from "./pages/teacher/teacher_community/TeacherUploadStudyMaterials";

// Admin
import AdminLayout from "./layouts/adminlayout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import BulkUpload from "./pages/admin/BulkUpload";
import TransferUser from "./pages/admin/TransferUser";
import AdminCalendar from "./pages/admin/AdminCalendar";
import ServerLogs from "./pages/admin/ServerLogs";
import ClassroomManagement from "./pages/admin/ClassroomManagement";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";

import SocketManager from "./components/SocketManager";

import { ChatProvider } from "./context/ChatProvider";
import { CommunityProvider } from "./context/CommunityContext";
import { ProjectProvider } from "./context/ProjectContext"; // ✅ 1. Import ProjectProvider

function App() {
  return (
    <ChatProvider>
      <CommunityProvider>
        {/* ✅ 2. Wrap everything in ProjectProvider */}
        <ProjectProvider>
          <SocketManager />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#fff',
                color: '#111827',
                border: '1px solid #E5E7EB',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#111827',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            {/* Auth */}
            <Route path="/" element={<Login />} />
            <Route
              path="/student/quiz/:assignmentId"
              element={
                <ProtectedRoute allowedRole="student">
                  <QuizActive />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="profile" element={<StudentProfile />} />
              <Route path="home" element={<StudentHome />} />
              <Route path="todo" element={<StudentTodos />} />
              <Route path="notes" element={<StudentNotes />} />
              <Route path="sketch" element={<StudentSketch />} />
              <Route path="calender" element={<StudentCalender />} />
              <Route path="studybot" element={<StudentStudyBot />} />
              <Route path="notif" element={<StudentNotif />} />
              <Route path="community" element={<StudentCommunity />} />
              <Route path="community/classroom" element={<StudentClassRoom />} />
              <Route path="community/groups" element={<StudentGroups />} />
              <Route path="community/study-materials" element={<StudentStudyMaterials />} />
            </Route>

            {/* Teacher Routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route path="profile" element={<TeacherProfile />} />
              <Route path="home" element={<TeacherHome />} />
              <Route path="todo" element={<TeacherTodos />} />
              <Route path="notes" element={<TeacherNotes />} />
              <Route path="sketch" element={<TeacherSketch />} />
              <Route path="calender" element={<TeacherCalender />} />
              <Route path="researchbot" element={<TeacherResearchBot />} />
              <Route path="notif" element={<TeacherNotif />} />
              <Route path="community" element={<TeacherCommunity />} />
              <Route path="community/classrooms" element={<TeacherClassRooms />} />
              <Route path="community/groups" element={<TeacherGroups />} />
              <Route path="community/publish-assignment" element={<TeacherPublishAssigment />} />
              <Route path="community/publish-assignment/:classroomId" element={<TeacherPublishAssigment />} />
              <Route path="community/upload-materials" element={<TeacherUploadStudyMaterials />} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="user-management" element={<UserManagement />} />
              <Route path="bulk-upload" element={<BulkUpload />} />
              <Route path="transfer-user" element={<TransferUser />} />
              <Route path="classroom-management" element={<ClassroomManagement />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="server-logs" element={<ServerLogs />} />
            </Route>
          </Routes>
        </ProjectProvider>
      </CommunityProvider>
    </ChatProvider>
  );
}

export default App;
