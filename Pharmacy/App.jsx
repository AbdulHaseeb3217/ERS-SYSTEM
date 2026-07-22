import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Requests } from "./pages/Requests";
import { Orders } from "./pages/Orders";
import { Profile } from "./pages/Profile";
import { ForgotPassword } from "./pages/ForgotPassword";
import { SupportChat } from "./pages/SupportChat";

import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { authService } from "./services/authService";

const Layout = ({
  user,
  children,
  onLogout,
  isOnline,
  onToggleStatus,
  title,
  requestCount,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar user={user} requestCount={requestCount} isOnline={isOnline} />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Header
          isOnline={isOnline}
          onToggleStatus={onToggleStatus}
          onLogout={onLogout}
          title={title}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const RouteTitle = ({ setTitle }) => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path.includes("/pharmacy/dashboard")) {
      setTitle("Dashboard");
    } else if (path.includes("/pharmacy/requests")) {
      setTitle("Prescription Requests");
    } else if (path.includes("/pharmacy/orders")) {
      setTitle("Past Orders");
    } else if (path.includes("/pharmacy/support-chat")) {
      setTitle("Support Chat");
    } else if (path.includes("/pharmacy/profile")) {
      setTitle("Profile Management");
    } else {
      setTitle("Dashboard");
    }
  }, [location, setTitle]);

  return null;
};

export default function PharmacyApp() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    document.title = "ERS Pharmacy Panel";
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();

    if (currentUser) {
      setUser(currentUser);

      if (currentUser.isOnline !== undefined) {
        setIsOnline(currentUser.isOnline);
      }
    }

    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setIsOnline(loggedInUser.isOnline || false);
    authService.saveUser(loggedInUser);

    document.title = "ERS Pharmacy Panel";
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setPendingCount(0);

    document.title = "ERS Pharmacy Panel";
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    authService.saveUser(updatedUser);
  };

  const handleToggleStatus = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (user) {
      const updated = { ...user, isOnline: newStatus };
      setUser(updated);
      authService.saveUser(updated);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pharmacy/login" replace />} />

      <Route
        path="/login"
        element={
          !user ? (
            <Login onLoginSuccess={handleLogin} />
          ) : (
            <Navigate to="/pharmacy/dashboard" replace />
          )
        }
      />

      <Route
        path="/register"
        element={
          !user ? <Register /> : <Navigate to="/pharmacy/dashboard" replace />
        }
      />

      <Route
        path="/forgot-password"
        element={
          !user ? (
            <ForgotPassword />
          ) : (
            <Navigate to="/pharmacy/dashboard" replace />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          user ? (
            <Layout
              user={user}
              onLogout={handleLogout}
              isOnline={isOnline}
              onToggleStatus={handleToggleStatus}
              title={currentTitle}
              requestCount={pendingCount}
            >
              <RouteTitle setTitle={setCurrentTitle} />

              <Dashboard
                user={user}
                onGoOnline={() => setIsOnline(true)}
                onUpdatePendingCount={(count) => setPendingCount(count)}
              />
            </Layout>
          ) : (
            <Navigate to="/pharmacy/login" replace />
          )
        }
      />

      <Route
        path="/requests"
        element={
          user ? (
            <Layout
              user={user}
              onLogout={handleLogout}
              isOnline={isOnline}
              onToggleStatus={handleToggleStatus}
              title={currentTitle}
              requestCount={pendingCount}
            >
              <RouteTitle setTitle={setCurrentTitle} />
              <Requests isOnline={isOnline} />
            </Layout>
          ) : (
            <Navigate to="/pharmacy/login" replace />
          )
        }
      />

      <Route
        path="/orders"
        element={
          user ? (
            <Layout
              user={user}
              onLogout={handleLogout}
              isOnline={isOnline}
              onToggleStatus={handleToggleStatus}
              title={currentTitle}
              requestCount={pendingCount}
            >
              <RouteTitle setTitle={setCurrentTitle} />
              <Orders />
            </Layout>
          ) : (
            <Navigate to="/pharmacy/login" replace />
          )
        }
      />

      <Route
        path="/support-chat"
        element={
          user ? (
            <Layout
              user={user}
              onLogout={handleLogout}
              isOnline={isOnline}
              onToggleStatus={handleToggleStatus}
              title={currentTitle}
              requestCount={pendingCount}
            >
              <RouteTitle setTitle={setCurrentTitle} />
              <SupportChat user={user} />
            </Layout>
          ) : (
            <Navigate to="/pharmacy/login" replace />
          )
        }
      />

      <Route
        path="/profile"
        element={
          user ? (
            <Layout
              user={user}
              onLogout={handleLogout}
              isOnline={isOnline}
              onToggleStatus={handleToggleStatus}
              title={currentTitle}
              requestCount={pendingCount}
            >
              <RouteTitle setTitle={setCurrentTitle} />
              <Profile user={user} onUpdateUser={handleUpdateUser} />
            </Layout>
          ) : (
            <Navigate to="/pharmacy/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/pharmacy/login" replace />} />
    </Routes>
  );
}