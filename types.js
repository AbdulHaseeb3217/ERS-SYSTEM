/**
 * Note: JavaScript mein Interfaces nahi hoti. 
 * Yeh file sirf aapke data structure ko samajhne ke liye hai.
 */

// User Object Structure
export const User = {
  id: "",
  name: "",
  email: "",
  avatar: "" // optional
};

// Dashboard Stats Structure
export const DashboardStats = {
  totalPatients: 0,
  activeDrivers: 0,
  activeRiders: 0,
  pharmacies: 0,
  trends: {
    patients: "",
    drivers: "",
    riders: "",
    pharmacies: ""
  }
};

// Order / Request Types
export const OrderStatus = ['in-progress', 'completed', 'pending', 'processing', 'delivered'];
export const Priority = ['critical', 'standard'];
export const OrderType = ['ambulance', 'bike', 'medicine'];

// Driver Status
export const DriverStatus = ['active', 'pending', 'blocked'];

// Pharmacy Order Status
export const PharmacyOrderStatus = ['Delivered', 'Pending', 'Cancelled', 'Processing'];

/**
 * Aap apne components mein in structures ko follow karenge.
 * Misal ke taur par:
 * const [patient, setPatient] = useState({
 * id: '',
 * name: '',
 * ambulanceHistory: [],
 * orderHistory: []
 * });
 */