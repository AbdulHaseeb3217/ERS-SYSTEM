import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import {
  Ambulance,
  Bike,
  Package,
  Eye,
  X,
  Search,
  MapPin,
  Filter,
} from "lucide-react";

const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  import.meta?.env?.VITE_API_URL ||
  "http://localhost:5000";

const formatMoney = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Rs. 0";
  return `Rs. ${n.toLocaleString("en-PK")}`;
};

const formatTimeAgo = (dateStr, fallback = "-") => {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return fallback;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

const getDisplayStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  const map = {
    pharmacy_processing: "Processing",
    dispatching: "Approved",
    delivering: "Delivering",
    reached_pharmacy: "Reached Pharmacy",
    navigating_to_patient: "Navigating to Patient",
    payment_pending: "Payment Pending",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In Progress",
    "in-progress": "In Progress",
  };
  return map[normalized] || status || "Pending";
};

const OrderModal = ({ order, onClose }) => {
  const type = order?.type || "medicine";
  const isMedicine = type === "medicine";
  const isBike = type === "bike";

  const patientName = order?.patientName || "N/A";
  const patientPhone = order?.patientPhone || "N/A";

  const assigneeName = order?.assigneeName || (isMedicine ? "Not assigned" : "N/A");
  const assigneePhone = order?.assigneePhone || "N/A";
  const assigneeId = order?.assigneeId || "N/A";

  const orderId = order?.id || order?._id || "N/A";
  const statusText = getDisplayStatus(order?.status);
  const priorityText = String(order?.priority || "standard").toUpperCase();

  const getStatusBadge = (status) => {
    const normalized = String(status || "").toLowerCase();
    let classes = "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm ";

    if (["delivered", "completed", "paid"].includes(normalized)) {
      classes += "bg-green-500 text-white";
    } else if (["processing", "pharmacy_processing", "pending", "dispatching", "approved", "payment pending", "payment_pending"].includes(normalized)) {
      classes += "bg-orange-500 text-white";
    } else if (["delivering", "navigating_to_patient", "in_progress", "in-progress", "accepted"].includes(normalized)) {
      classes += "bg-blue-500 text-white";
    } else if (["cancelled", "critical"].includes(normalized)) {
      classes += "bg-red-500 text-white";
    } else if (["standard", "regular"].includes(normalized)) {
      classes += "bg-blue-400 text-white";
    } else {
      classes += "bg-gray-400 text-white";
    }

    return <span className={classes}>{status}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        <div className="p-6 flex justify-between items-center border-b border-gray-100 text-left">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
              {isMedicine ? "Medicine Order Details" : isBike ? "Bike Request Details" : "Ambulance Request Details"}
            </h2>
            <p className="text-[11px] text-gray-400 font-medium">Complete information about this order</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar text-left">
          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Order Information</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-[10px] font-medium text-gray-400">Order ID</p>
                <p className="text-[11px] font-bold text-gray-800">{orderId}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400">Status</p>
                <div className="mt-1">{getStatusBadge(statusText)}</div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400">Priority</p>
                <div className="mt-1">{getStatusBadge(priorityText)}</div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400">Time</p>
                <p className="text-[11px] font-bold text-gray-800">{order?.time || formatTimeAgo(order?.createdAt)}</p>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-gray-100" />

          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Patient Information</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-[10px] font-medium text-gray-400">Patient Name</p>
                <p className="text-[11px] font-bold text-gray-800 mt-0.5">{patientName}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400">Phone</p>
                <p className="text-[11px] font-bold text-gray-800 mt-0.5">{patientPhone}</p>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-gray-100" />

          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              {isMedicine ? "Pharmacy & Rider Info" : isBike ? "Rider Information" : "Driver Information"}
            </h3>
            <div className="grid grid-cols-2 gap-y-4">
              {isMedicine && (
                <div className="col-span-2 grid grid-cols-2 gap-4 pb-4 border-b border-gray-50 mb-2">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Pharmacy Name</p>
                    <p className="text-[11px] font-bold text-gray-800">{order?.pharmacyName || "Not assigned"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Phone</p>
                    <p className="text-[11px] font-bold text-gray-800">{order?.pharmacyPhone || "N/A"}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-medium text-gray-400">{isMedicine || isBike ? "Rider Name" : "Driver Name"}</p>
                <p className="text-[11px] font-bold text-gray-800 mt-0.5">{assigneeName}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400">Phone</p>
                <p className="text-[11px] font-bold text-gray-800 mt-0.5">{assigneePhone}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400">{isMedicine || isBike ? "Bike Number" : "Ambulance Number"}</p>
                <p className="text-[11px] font-bold text-gray-800 mt-0.5">{assigneeId}</p>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-gray-100" />

          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{isMedicine ? "Order Details" : "Location Details"}</h3>
            <div className="space-y-4">
              {isMedicine ? (
                <>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Medicines</p>
                    <p className="text-[11px] font-bold text-gray-800 leading-snug">{order?.medicinesText || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Medical Equipment</p>
                    <p className="text-[11px] font-bold text-gray-800 leading-snug">{order?.equipmentText || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Amount</p>
                    <p className="text-[11px] font-bold text-gray-800">{order?.amount || "Rs. 0"}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin size={12} className="text-gray-300 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Delivery Address</p>
                      <p className="text-[11px] font-bold text-gray-800">{order?.deliveryAddress || "N/A"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start space-x-2">
                    <MapPin size={12} className="text-gray-300 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Pickup Location</p>
                      <p className="text-[11px] font-bold text-gray-800">{order?.pickupLocation || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin size={12} className="text-gray-300 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Drop-off Location</p>
                      <p className="text-[11px] font-bold text-gray-800">{order?.dropoffLocation || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Fare</p>
                    <p className="text-[11px] font-bold text-gray-800">{order?.fare || "Rs. 0"}</p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg text-[11px] font-bold hover:bg-gray-900 transition-colors uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const Orders = ({ user, onLogout, initialTab, onSetActivePage }) => {
  const [activeTab, setActiveTab] = useState(initialTab || "ambulance");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({ totalAmb: 0, totalBike: 0, totalMeds: 0, activeAmb: 0, activeBike: 0, activeMeds: 0 });

  const fetchDatabaseRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/all`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Orders load failed");
      }

      setOrders(data?.orders || []);
      setMetrics(data?.metrics || { totalAmb: 0, totalBike: 0, totalMeds: 0, activeAmb: 0, activeBike: 0, activeMeds: 0 });
    } catch (error) {
      console.error("Admin orders fetch error:", error.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseRequests();
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesTab = order.type === activeTab;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        String(order.id || "").toLowerCase().includes(query) ||
        String(order.patientName || "").toLowerCase().includes(query) ||
        String(order.pharmacyName || "").toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery, orders]);

  const getStatusBadge = (status) => {
    const normalized = String(status || "").toLowerCase();
    let classes = "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm ";

    if (["delivered", "completed", "paid"].includes(normalized)) {
      classes += "bg-green-500 text-white";
    } else if (["pharmacy_processing", "processing", "pending", "dispatching", "approved", "payment_pending"].includes(normalized)) {
      classes += "bg-orange-500 text-white";
    } else if (["delivering", "navigating_to_patient", "in_progress", "in-progress", "accepted"].includes(normalized)) {
      classes += "bg-blue-500 text-white";
    } else if (["cancelled", "critical"].includes(normalized)) {
      classes += "bg-red-500 text-white";
    } else if (["standard", "regular", "emergency"].includes(normalized)) {
      classes += normalized === "emergency" ? "bg-red-500 text-white" : "bg-blue-400 text-white";
    } else {
      classes += "bg-gray-400 text-white";
    }

    return <span className={classes}>{getDisplayStatus(status)}</span>;
  };

  return (
    <div className="relative flex bg-[#f9fafb] min-h-screen">
      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      <Sidebar activeTab="orders" onLogout={onLogout} onTabClick={onSetActivePage} />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Orders</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              Emergency Response System Admin Panel
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight uppercase tracking-wider">
                {user?.name || "Admin User"}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">{user?.email || "admin@ers.com"}</p>
            </div>
            <div className="w-8 h-8 bg-[#e10000] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-50 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ambulance</p>
              <h3 className="text-lg font-bold text-gray-800">
                {metrics.totalAmb ?? metrics.activeAmb ?? 0} <span className="text-[10px] text-red-500 ml-1">Total</span>
              </h3>
            </div>
            <div className="bg-red-50 p-2.5 rounded-xl text-red-500">
              <Ambulance size={18} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-50 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bike Delivery</p>
              <h3 className="text-lg font-bold text-gray-800">
                {metrics.totalBike ?? metrics.activeBike ?? 0} <span className="text-[10px] text-blue-500 ml-1">Total</span>
              </h3>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500">
              <Bike size={18} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-green-50 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Medicine Orders</p>
              <h3 className="text-lg font-bold text-gray-800">
                {metrics.totalMeds ?? metrics.activeMeds ?? 0} <span className="text-[10px] text-green-500 ml-1">Total</span>
              </h3>
            </div>
            <div className="bg-green-50 p-2.5 rounded-xl text-green-500">
              <Package size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-white flex justify-between items-center text-left">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Orders & Requests Management</h2>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Real-time control for all medical operations</p>
            </div>
            <button
              onClick={fetchDatabaseRequests}
              className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-gray-100 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="px-6 mt-6">
            <div className="p-1 bg-gray-50 rounded-xl flex space-x-1">
              <button
                onClick={() => { setActiveTab("ambulance"); setSearchQuery(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "ambulance" ? "bg-white shadow-sm text-[#e10000]" : "text-gray-400 hover:text-gray-600"}`}
              >
                Ambulance
              </button>
              <button
                onClick={() => { setActiveTab("bike"); setSearchQuery(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "bike" ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                Bike Delivery
              </button>
              <button
                onClick={() => { setActiveTab("medicine"); setSearchQuery(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "medicine" ? "bg-white shadow-sm text-green-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                Medicine Orders
              </button>
            </div>
          </div>

          <div className="px-6 py-5 flex items-center space-x-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search by Order ID, Patient or Pharmacy in ${activeTab}...`}
                className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-gray-700 focus:ring-1 focus:ring-red-100 transition-all outline-none"
              />
            </div>
            <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-colors">
              <Filter size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-[#e10000] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-gray-400">Loading records from database...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-16 text-center text-xs font-bold text-gray-400">No records found in database logs.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patient</th>

                    {activeTab === "medicine" ? (
                      <>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pharmacy</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{activeTab === "bike" ? "Rider" : "Driver"}</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pickup</th>
                        {activeTab === "bike" && <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery</th>}
                        {activeTab === "ambulance" && <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority</th>}
                      </>
                    )}

                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <tr key={`${order.type}-${order._id || order.id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 text-[11px] font-bold text-gray-800">{order.id}</td>
                      <td className="px-6 py-5 text-[11px] font-medium text-gray-600">{order.patientName}</td>

                      {activeTab === "medicine" ? (
                        <>
                          <td className="px-6 py-5 text-[11px] font-medium text-gray-600">{order.pharmacyName}</td>
                          <td className="px-6 py-5 text-[11px] font-medium text-gray-600 max-w-[150px] truncate">{order.items}</td>
                          <td className="px-6 py-5 text-[11px] font-medium text-gray-600">{order.amount}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-5 text-[11px] font-medium text-gray-600">{order.assigneeName}</td>
                          <td className="px-6 py-5 text-[11px] font-medium text-gray-600 max-w-[150px] truncate">{order.pickupLocation}</td>
                          {activeTab === "bike" && <td className="px-6 py-5 text-[11px] font-medium text-gray-600 max-w-[150px] truncate">{order.dropoffLocation}</td>}
                          {activeTab === "ambulance" && <td className="px-6 py-5">{getStatusBadge(order.priority)}</td>}
                        </>
                      )}

                      <td className="px-6 py-5">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-5 text-[11px] font-medium text-gray-500">{order.time || formatTimeAgo(order.createdAt)}</td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-800 border border-transparent"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default Orders;
