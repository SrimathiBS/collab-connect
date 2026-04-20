// CollabX uses /pages/Landing.tsx as the marketing home and /app/* for the dashboard.
// This file is kept for backward compatibility — redirect to landing.
import { Navigate } from "react-router-dom";
const Index = () => <Navigate to="/" replace />;
export default Index;
