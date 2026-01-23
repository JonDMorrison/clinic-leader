import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Copilot is now integrated into the dashboard via CopilotWidget and CopilotDrawer
// This page redirects to the dashboard
const Copilot = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default Copilot;
