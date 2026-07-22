import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Drivers from "./pages/Drivers";
import Riders from "./pages/Riders";
import Pharmacies from "./pages/Pharmacies";
import Patients from "./pages/Patients";
import Settings from "./pages/Settings";
import SupportChats from "./pages/SupportChats";
import { logout } from "./services/authService";

const App = () => {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [orderTab, setOrderTab] = useState("ambulance");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    document.title = "ERS Admin Panel";

    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Session recovery failed");
        localStorage.removeItem("user");
      }
    }

    setInitialized(true);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", "fake-jwt-token");
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setActivePage("dashboard");
  };

  const navigateToOrders = (tab) => {
    setOrderTab(tab);
    setActivePage("orders");
  };

  const handleTabClick = (tabId) => {
    if (
      [
        "orders",
        "drivers",
        "riders",
        "pharmacies",
        "patients",
        "settings",
        "dashboard",
        "support",
      ].includes(tabId)
    ) {
      setActivePage(tabId);
    } else {
      setActivePage("dashboard");
    }
  };

  if (!initialized) return null;

  return (
    <div className="antialiased text-gray-900 font-sans">
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {activePage === "dashboard" && (
            <Dashboard
              user={user}
              onLogout={handleLogout}
              onNavigateToOrders={navigateToOrders}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "orders" && (
            <Orders
              user={user}
              onLogout={handleLogout}
              initialTab={orderTab}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "drivers" && (
            <Drivers
              user={user}
              onLogout={handleLogout}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "riders" && (
            <Riders
              user={user}
              onLogout={handleLogout}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "pharmacies" && (
            <Pharmacies
              user={user}
              onLogout={handleLogout}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "patients" && (
            <Patients
              user={user}
              onLogout={handleLogout}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "support" && (
            <SupportChats
              user={user}
              onLogout={handleLogout}
              onSetActivePage={handleTabClick}
            />
          )}

          {activePage === "settings" && (
            <Settings
              user={user}
              onLogout={handleLogout}
              onSetActivePage={handleTabClick}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;