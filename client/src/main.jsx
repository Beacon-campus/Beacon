import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ServerWakeupModal from "./components/ServerWakeupModal";
import "./index.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error("Missing required env var: VITE_API_BASE_URL");
}

export const server = apiBaseUrl;

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ServerWakeupModal>
      <AuthProvider>
        {/* AuthProvider stays here to provide user data to everything inside App */}
        <App />
      </AuthProvider>
    </ServerWakeupModal>
  </BrowserRouter>
);
