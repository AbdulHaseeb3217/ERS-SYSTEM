import React from "react";

/** =========================
 *  Shared UI Constants (Admin)
 *  ========================= */
export const COLORS = {
  primary: "#E31B23",
  primaryHover: "#C4151C",
  bgLight: "#F8F9FA",
  sidebarText: "#4A5568",
  sidebarActive: "#FEF2F2",
  sidebarActiveText: "#EF4444",
};

export const ERSLogo = ({ size = 48, className = "" }) => {
  const safeSize = size || 48;

  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-[#E31B23] shadow-lg shadow-red-100/50 ${className}`}
      style={{ width: safeSize, height: safeSize }}
    >
      <svg
        width={safeSize * 0.55}
        height={safeSize * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );
};

/** =========================
 *  Pharmacy Mock Data
 *  ========================= */
export const MOCK_USER = {
  id: "1",
  name: "Demo Pharmacy Owner",
  email: "pharmacy@example.com",
  pharmacyName: "Demo Pharmacy",
  licenseId: "LIC-12345",
  address: "DHA Phase 5, Lahore",
  contactNumber: "+92 300 1234567",
  isOnline: false, // ✅ helpful for your pharmacy online/offline toggle
};

export const MOCK_STATS = {
  pendingRequests: 3,
  completedToday: 12,
  totalOrders: 248,
};

export const MOCK_REQUESTS = [
  {
    id: "req-1",
    patientName: "Ahmed Hassan",
    timestamp: "10 minutes ago",
    distance: "2.3 km away",
    location: "DHA Phase 5, Lahore",
    contactNumber: "+92 300 1234567",
    priority: "High",
    type: "Emergency",
    medicines: ["Panadol 500mg", "Augmentin 625mg", "Brufen 400mg"],
    imageUrl: "https://picsum.photos/400/200?random=1",
    status: "pending",
  },
  {
    id: "req-2",
    patientName: "Fatima Khan",
    timestamp: "25 minutes ago",
    distance: "3.5 km away",
    location: "Gulberg III, Lahore",
    contactNumber: "+92 301 7654321",
    priority: "Medium",
    type: "Regular",
    medicines: ["Insulin Injection", "Glucometer Strips", "Lancets"],
    imageUrl: "https://picsum.photos/400/200?random=2",
    status: "pending",
  },
];

export const MOCK_ORDERS = [
  {
    id: "1",
    orderId: "ORD-248",
    patientName: "Saima Malik",
    riderName: "Hassan Ali",
    orderDate: "10/24/2025",
    deliveryTime: "25 mins",
    items: ["Panadol 500mg x2", "Calpol Syrup", "Vitamin D3"],
    totalAmount: 1250,
    status: "Completed",
    paymentStatus: "Paid",
  },
  {
    id: "2",
    orderId: "ORD-247",
    patientName: "Bilal Ahmed",
    riderName: "Usman Khan",
    orderDate: "10/24/2025",
    deliveryTime: "30 mins",
    items: ["Augmentin", "Brufen"],
    totalAmount: 850,
    status: "Completed",
    paymentStatus: "Paid",
  },
  {
    id: "3",
    orderId: "ORD-246",
    patientName: "Ayesha Farooq",
    riderName: "Ali Raza",
    orderDate: "10/23/2025",
    deliveryTime: "15 mins",
    items: ["Bandages", "Pyodine"],
    totalAmount: 450,
    status: "Completed",
    paymentStatus: "Paid",
  },
  {
    id: "4",
    orderId: "ORD-245",
    patientName: "Zainab Hassan",
    riderName: "Ahmed Khan",
    orderDate: "10/23/2025",
    deliveryTime: "45 mins",
    items: ["Cough Syrup", "Lozenges"],
    totalAmount: 5500,
    status: "Completed",
    paymentStatus: "Paid",
  },
  {
    id: "5",
    orderId: "ORD-244",
    patientName: "Kamran Shah",
    riderName: "Bilal Waris",
    orderDate: "10/22/2025",
    deliveryTime: "20 mins",
    items: ["Insulin", "Swabs"],
    totalAmount: 2100,
    status: "Completed",
    paymentStatus: "Paid",
  },
];
