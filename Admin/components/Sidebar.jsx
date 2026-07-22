import React from "react";
import {
  LayoutGrid,
  Truck,
  Bike,
  Store,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { ERSLogo } from "../../constants";

const Sidebar = ({ activeTab, onLogout, onTabClick }) => {
  const menuItems = [
    { id: "dashboard", icon: LayoutGrid, label: "Dashboard" },
    { id: "drivers", icon: Truck, label: "Drivers" },
    { id: "riders", icon: Bike, label: "Riders" },
    { id: "pharmacies", icon: Store, label: "Pharmacies" },
    { id: "patients", icon: Users, label: "Patients" },
    { id: "orders", icon: ShoppingCart, label: "Orders" },
    { id: "support", icon: MessageCircle, label: "Support Chats" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-5 flex items-center space-x-3">
        <ERSLogo size={32} />

        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-gray-800 leading-tight">
            ERS Admin
          </h1>
          <p className="text-[10px] text-gray-400 font-medium">
            Control Panel
          </p>
        </div>
      </div>

      <div className="h-[1px] bg-gray-50 mx-4 mb-4"></div>

      <nav className="flex-1 px-3 space-y-1 text-left">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onTabClick && onTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-red-50 text-red-500"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-4 py-2 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;