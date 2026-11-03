import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LoadingState } from "../components/Common.jsx";

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState label="Verifying your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}

