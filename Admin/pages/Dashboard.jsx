import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import {
  Users,
  Car,
  Bike,
  Landmark,
  Ambulance,
  Package,
  Bell,
  X,
  UserCheck,
} from "lucide-react";
import {
  fetchDashboardData,
  fetchAdminNotifications,
  fetchAdminUnreadCount,
  markAllAdminNotificationsRead,
  logout,
} from "../services/authService";

const Dashboard = ({ user, onNavigateToOrders, onSetActivePage }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const stats = await fetchDashboardData();
      setData(stats);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotificationLoading(true);

      const [items, count] = await Promise.all([
        fetchAdminNotifications(),
        fetchAdminUnreadCount(),
      ]);

      setNotifications(Array.isArray(items) ? items : []);
      setUnreadCount(Number(count || 0));
    } catch (err) {
      console.error("Admin notification error:", err);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadNotifications();

    const timer = setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const handleNotificationToggle = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications();

      try {
        await markAllAdminNotificationsRead();
        setUnreadCount(0);
      } catch (err) {
        console.error("Mark all admin notifications read error:", err);
      }
    }
  };

  const goToApprovalPage = (targetType) => {
    setNotificationOpen(false);

    if (targetType === "bike_rider") {
      if (typeof onSetActivePage === "function") {
        onSetActivePage("riders");
      }
      return;
    }

    if (targetType === "ambulance_driver") {
      if (typeof onSetActivePage === "function") {
        onSetActivePage("drivers");
      }
      return;
    }
  };

  const formatNotificationTime = (value) => {
    if (!value) return "Just now";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Just now";

    return date.toLocaleString();
  };

  const getNotificationIconColor = (targetType) => {
    if (targetType === "bike_rider") {
      return "bg-purple-100 text-purple-600";
    }

    if (targetType === "ambulance_driver") {
      return "bg-red-100 text-red-600";
    }

    return "bg-gray-100 text-gray-600";
  };

  const getStatusBadge = (approvalStatus) => {
    const status = String(approvalStatus || "pending").toLowerCase();

    if (status === "approved") {
      return (
        <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-green-100 text-green-700 uppercase">
          Approved
        </span>
      );
    }

    if (status === "blocked") {
      return (
        <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-red-100 text-red-700 uppercase">
          Blocked
        </span>
      );
    }

    return (
      <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-yellow-100 text-yellow-700 uppercase">
        Pending
      </span>
    );
  };

  const goToOrders = (tabName) => {
    if (typeof onNavigateToOrders === "function") {
      onNavigateToOrders(tabName);
      return;
    }

    if (typeof onSetActivePage === "function") {
      onSetActivePage("orders", tabName);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f9fafb]">
        <div className="text-xs font-bold text-gray-400 animate-pulse uppercase tracking-widest">
          Updating Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#f9fafb] min-h-screen font-sans">
      <Sidebar
        activeTab="dashboard"
        onLogout={logout}
        onTabClick={onSetActivePage}
      />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              Emergency Response System
            </p>
          </div>

          <div className="flex items-center space-x-3 relative">
            {/* Admin Notification Bell */}
            <div className="relative">
              <button
                onClick={handleNotificationToggle}
                className="relative w-9 h-9 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
              >
                <Bell size={17} />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-12 w-[360px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Admin Notifications
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">
                        Pending approval requests
                      </p>
                    </div>

                    <button
                      onClick={() => setNotificationOpen(false)}
                      className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto">
                    {notificationLoading && notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider animate-pulse">
                          Loading notifications...
                        </p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-10 text-center px-5">
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                          <Bell size={18} />
                        </div>
                        <p className="text-xs font-bold text-gray-700">
                          No notifications
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          New rider or ambulance driver approval requests will
                          appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => goToApprovalPage(item.targetType)}
                          className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationIconColor(
                                item.targetType
                              )}`}
                            >
                              <UserCheck size={16} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-bold text-gray-800 leading-snug">
                                  {item.title}
                                </p>

                                {getStatusBadge(item.approvalStatus)}
                              </div>

                              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                {item.message}
                              </p>

                              <div className="flex items-center justify-between mt-2">
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {item.targetName || "Unknown User"}
                                  {item.targetPhone ? ` • ${item.targetPhone}` : ""}
                                </p>

                                <p className="text-[9px] text-gray-400 font-medium">
                                  {formatNotificationTime(item.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight">
                {user?.name || "Admin User"}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">
                {user?.email || "admin@ers.com"}
              </p>
            </div>

            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {(user?.name || "H").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Active Patients"
            value={data?.stats?.activePatients || 0}
            trend="+12.5%"
            icon={<Users size={16} />}
            iconColorClass="bg-blue-500"
          />

          <StatCard
            title="Active Drivers"
            value={data?.stats?.activeDrivers || 0}
            trend="+5.2%"
            icon={<Car size={16} />}
            iconColorClass="bg-green-500"
          />

          <StatCard
            title="Active Riders"
            value={data?.stats?.activeRiders || 0}
            trend="+8.1%"
            icon={<Bike size={16} />}
            iconColorClass="bg-purple-500"
          />

          <StatCard
            title="Active Pharmacies"
            value={data?.stats?.activePharmacies || 0}
            trend="+2.3%"
            icon={<Landmark size={16} />}
            iconColorClass="bg-orange-500"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest text-left">
            Active Requests & Orders
          </h2>

          <button
            onClick={() => {
              loadStats();
              loadNotifications();
            }}
            className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
          >
            Refresh Stats
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Ambulance Requests */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col text-left shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-500 p-2 rounded-lg text-white">
                <Ambulance size={16} />
              </div>

              <h3 className="font-bold text-gray-800 text-xs uppercase">
                Ambulance Requests
              </h3>
            </div>

            <p className="text-[11px] text-gray-400 font-bold mb-5">
              {data?.requests?.ambulance?.inProgress || 0} In Progress,{" "}
              {data?.requests?.ambulance?.pending || 0} Pending
            </p>

            <div className="mt-auto">
              <p className="text-sm font-bold text-gray-800 mb-4">
                {data?.requests?.ambulance?.active || 0} Active
              </p>

              <button
                onClick={() => goToOrders("ambulance")}
                className="w-full py-2 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-red-600 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Bike Requests */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col text-left shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-500 p-2 rounded-lg text-white">
                <Bike size={16} />
              </div>

              <h3 className="font-bold text-gray-800 text-xs uppercase">
                Bike Requests
              </h3>
            </div>

            <p className="text-[11px] text-gray-400 font-bold mb-5">
              {data?.requests?.bike?.inProgress || 0} In Progress,{" "}
              {data?.requests?.bike?.pending || 0} Pending
            </p>

            <div className="mt-auto">
              <p className="text-sm font-bold text-gray-800 mb-4">
                {data?.requests?.bike?.active || 0} Active
              </p>

              <button
                onClick={() => goToOrders("bike")}
                className="w-full py-2 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Pharmacy Orders */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col text-left shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-500 p-2 rounded-lg text-white">
                <Package size={16} />
              </div>

              <h3 className="font-bold text-gray-800 text-xs uppercase">
                Pharmacy Orders
              </h3>
            </div>

            <p className="text-[11px] text-gray-400 font-bold mb-5">
              {data?.requests?.pharmacy?.processing || 0} Processing,{" "}
              {data?.requests?.pharmacy?.delivered || 0} Delivered
            </p>

            <div className="mt-auto">
              <p className="text-sm font-bold text-gray-800 mb-4">
                {data?.requests?.pharmacy?.active || 0} Active
              </p>

              <button
                onClick={() => goToOrders("medicine")}
                className="w-full py-2 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-green-600 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;