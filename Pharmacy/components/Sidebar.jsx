import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ShoppingBag,
  User,
  MessageCircle,
} from "lucide-react";

export const Sidebar = ({ user, requestCount, isOnline }) => {
  const location = useLocation();
  const showBadge = isOnline && requestCount > 0;

  const menuItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/pharmacy/dashboard",
    },
    {
      label: "Prescription Requests",
      icon: <FileText size={20} />,
      path: "/pharmacy/requests",
      badge: showBadge ? requestCount : null,
    },
    {
      label: "Past Orders",
      icon: <ShoppingBag size={20} />,
      path: "/pharmacy/orders",
    },
    {
      label: "Support Chat",
      icon: <MessageCircle size={20} />,
      path: "/pharmacy/support-chat",
    },
    {
      label: "Profile Management",
      icon: <User size={20} />,
      path: "/pharmacy/profile",
    },
  ];

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 01-2-2h-4a2 2 0 01-2 2v2m2-4h.01M17 16l-3-3m0 0l-3 3m3-3V9"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              ERS Pharmacy
            </h1>
            <p className="text-[10px] text-gray-500">Portal</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            {user?.pharmacyName
              ? user.pharmacyName.charAt(0).toUpperCase()
              : "P"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.pharmacyName || "Pharmacy"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || "pharmacy@ers.com"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center p-3 text-sm font-medium rounded-lg group transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`${
                      isActive
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="ml-3 flex-1 whitespace-nowrap">
                    {item.label}
                  </span>

                  {item.badge && (
                    <span className="inline-flex items-center justify-center w-5 h-5 px-2 ml-3 text-xs font-medium text-white bg-red-500 rounded-full shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};