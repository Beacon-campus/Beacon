import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

export const server = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      {/* AuthProvider stays here to provide user data to everything inside App */}
      <App />
    </AuthProvider>
  </BrowserRouter>
);