import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import SpamDetector from "./pages/SpamDetector.jsx";
import History from "./pages/History.jsx";
import ModelEvaluation from "./pages/ModelEvaluation.jsx";
import PosTagging from "./pages/PosTagging.jsx";
import TextSimilarity from "./pages/TextSimilarity.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public Authentication Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<SpamDetector />} />
          <Route path="/history" element={<History />} />
          <Route path="/evaluation" element={<ModelEvaluation />} />
          <Route path="/pos" element={<PosTagging />} />
          <Route path="/similarity" element={<TextSimilarity />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
