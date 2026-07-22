import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  X,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { api } from "../services/api";

const STORAGE_KEY = "pharmacy_user";

const getCurrentPharmacyUser = () => {
  const raw =
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem("user") ||
    localStorage.getItem("pharmacy_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const formatMoney = (amount) => {
  const value = Number(amount || 0);
  return value.toLocaleString("en-PK");
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const normalizeOrder = (order) => {
  const medicines = Array.isArray(order?.medicines)
    ? order.medicines
    : Array.isArray(order?.medicineItems)
      ? order.medicineItems
      : [];

  const equipment = Array.isArray(order?.equipment)
    ? order.equipment
    : Array.isArray(order?.equipmentItems)
      ? order.equipmentItems
      : [];

  const items = Array.isArray(order?.items) && order.items.length > 0
    ? order.items
    : [...medicines, ...equipment];

  return {
    id: order?.id || order?._id || order?.orderId,
    orderId:
      order?.orderId ||
      order?.orderCode ||
      `ORD-${String(order?.id || order?._id || "000").slice(-4).toUpperCase()}`,
    patientName:
      order?.patientName ||
      order?.patientInfo?.name ||
      order?.patient?.fullName ||
      "Unknown Patient",
    riderName:
      order?.riderName ||
      order?.riderInfo?.name ||
      order?.rider?.fullName ||
      order?.rider?.name ||
      "N/A",
    orderDate: formatDate(order?.orderDate || order?.requestedAt || order?.createdAt),
    deliveryTime: order?.deliveryTime || `${order?.deliveryMinutes || 0} mins`,
    medicines,
    equipment,
    items,
    totalAmount: Number(order?.totalAmount ?? order?.amount ?? 0),
    status: order?.status === "delivered" ? "Completed" : order?.status || "Completed",
    paymentStatus:
      order?.paymentStatus === "paid" ? "Paid" : order?.paymentStatus || "Paid",
  };
};

const OrderModal = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Order Details - {order.orderId}
            </h3>
            <p className="text-xs text-gray-500">
              Complete information about this order
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1">
                Patient Name
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {order.patientName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1">
                Order Date
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {order.orderDate}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1">
                Rider Name
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {order.riderName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1">
                Delivery Time
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {order.deliveryTime}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 font-medium uppercase mb-3">
              Items Delivered
            </p>

            {order.items.length === 0 ? (
              <p className="text-sm text-gray-500">No items found</p>
            ) : (
              <ul className="space-y-2">
                {order.items.map((item, idx) => (
                  <li
                    key={`${item}-${idx}`}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <CheckCircle size={16} className="text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              <p className="text-xs text-gray-500">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">
                PKR {formatMoney(order.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                {order.status}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Orders = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgDeliveryTime: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCompletedOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const pharmacyUser = getCurrentPharmacyUser();
      const pharmacyId = pharmacyUser?.id || pharmacyUser?._id;

      if (!pharmacyId) {
        throw new Error("Pharmacy ID not found. Please login again.");
      }

      const data = await api.getCompletedPharmacyOrders(pharmacyId);
      const normalized = (data?.orders || []).map(normalizeOrder);

      setOrders(normalized);
      setStats(
        data?.stats || {
          totalOrders: normalized.length,
          totalRevenue: normalized.reduce(
            (sum, item) => sum + Number(item.totalAmount || 0),
            0
          ),
          avgDeliveryTime: 0,
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load completed orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      return (
        order.orderId.toLowerCase().includes(q) ||
        order.patientName.toLowerCase().includes(q) ||
        order.riderName.toLowerCase().includes(q)
      );
    });
  }, [orders, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto">
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Past Orders</h1>
          <p className="text-sm text-gray-500">
            View and manage your pharmacy order history
          </p>
        </div>

        <button
          onClick={loadCompletedOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-medium uppercase">
            Total Orders
          </p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            {stats.totalOrders || 0}
          </h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-medium uppercase">
            Total Revenue
          </p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1 flex items-center justify-between">
            PKR {formatMoney(stats.totalRevenue)}
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <span className="text-sm font-bold">$</span>
            </div>
          </h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-medium uppercase">
            Avg. Delivery Time
          </p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1 flex items-center justify-between">
            {stats.avgDeliveryTime || 0} mins
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Clock size={16} />
            </div>
          </h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID or patient name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Filter size={18} />
          Filter
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading completed orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                    No completed orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.orderId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.patientName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Showing {filteredOrders.length === 0 ? 0 : 1}-{filteredOrders.length} of {filteredOrders.length} orders
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs border rounded bg-white disabled:opacity-50" disabled>
              Prev
            </button>
            <button className="px-3 py-1 text-xs border rounded bg-white disabled:opacity-50" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
