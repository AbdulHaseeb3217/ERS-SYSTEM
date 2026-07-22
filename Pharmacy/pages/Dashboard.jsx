import React, { useState, useEffect } from "react";
import { FileText, CheckCircle, ShoppingBag } from "lucide-react";
import { api } from "../services/api";

const StatCard = ({ title, value, icon, color, badge }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>

        {badge && (
          <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {title}
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

export const Dashboard = ({ user, onGoOnline, onUpdatePendingCount }) => {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    completedToday: 0,
    totalOrders: 0,
  });

  const [loading, setLoading] = useState(true);

  const pharmacyId = user?.id || user?._id;

  const fetchStats = async () => {
    if (!pharmacyId) return;

    try {
      const response = await api.getDashboardStats(pharmacyId);

      setStats(
        response.stats || {
          pendingRequests: 0,
          completedToday: 0,
          totalOrders: 0,
        }
      );

      if (onUpdatePendingCount) {
        onUpdatePendingCount(response.stats?.pendingRequests || 0);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [pharmacyId]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome Back, {user?.pharmacyName}!
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Manage your pharmacy operations and prescription requests
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading Stats...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Pending Requests"
            value={stats.pendingRequests}
            icon={<FileText size={20} />}
            color="blue"
            badge="Active"
          />

          <StatCard
            title="Completed Today"
            value={stats.completedToday}
            icon={<CheckCircle size={20} />}
            color="green"
          />

          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<ShoppingBag size={20} />}
            color="purple"
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;