import React, { useEffect, useState } from "react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { LocationAutocompleteInput } from "../components/LocationAutocompleteInput";
import {
  Building,
  Mail,
  Phone,
  FileBadge,
  MapPin,
  Lock,
  CheckCircle,
  Shield,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { authService } from "../services/authService";
import { isValidLngLat } from "../utils/locationUtils";

export const Profile = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    pharmacyName: "",
    contactNumber: "",
    address: "",
    operatingHours: "24/7",
    location: null,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    const fetchLatestProfile = async () => {
      if (user && (user.id || user._id)) {
        try {
          const freshData = await authService.getProfile(user.id || user._id);
          setFormData({
            pharmacyName: freshData.pharmacyName || "",
            contactNumber: freshData.contactNumber || freshData.phone || "",
            address: freshData.address || "",
            operatingHours: freshData.operatingHours || "24/7",
            location: freshData.location || null,
          });
          onUpdateUser?.(freshData);
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      }
    };

    fetchLatestProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (address) => {
    setFormData((prev) => ({
      ...prev,
      address,
      // Typed address means old coordinates may be stale. User should select a suggestion.
      location: null,
    }));
  };

  const handleLocationSelect = (result) => {
    setFormData((prev) => ({
      ...prev,
      address: result.address,
      location: result.location,
    }));
    setNotification(null);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData({
      pharmacyName: user.pharmacyName || "",
      contactNumber: user.contactNumber || user.phone || "",
      address: user.address || "",
      operatingHours: user.operatingHours || "24/7",
      location: user.location || null,
    });
    setNotification(null);
  };

  const handleSave = async () => {
    setNotification(null);

    if (!formData.pharmacyName.trim()) {
      setNotification({ type: "error", message: "Pharmacy name is required." });
      return;
    }

    if (!/^\d{11}$/.test(formData.contactNumber || "")) {
      setNotification({ type: "error", message: "Contact number must be exactly 11 digits." });
      return;
    }

    if (!formData.address.trim()) {
      setNotification({ type: "error", message: "Address is required." });
      return;
    }

    if (!isValidLngLat(formData.location?.coordinates)) {
      setNotification({
        type: "error",
        message: "Please select a valid address from suggestions so coordinates can be updated.",
      });
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await authService.updateProfile({
        pharmacyName: formData.pharmacyName,
        contactNumber: formData.contactNumber,
        address: formData.address,
        operatingHours: formData.operatingHours,
        location: formData.location,
      });

      onUpdateUser?.(updatedUser);
      setNotification({ type: "success", message: "Profile updated successfully!" });
    } catch (error) {
      setNotification({ type: "error", message: error.message || "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setNotification(null);

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setNotification({ type: "error", message: "New passwords do not match" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setNotification({ type: "error", message: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setNotification({ type: "success", message: "Password changed successfully!" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (error) {
      setNotification({ type: "error", message: error.message || "Failed to change password" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "approved":
      case "verified":
      case "connected":
      case "active":
        return {
          color: "bg-green-500",
          bg: "bg-green-50",
          text: "text-green-600",
          icon: <CheckCircle size={20} />,
        };
      case "rejected":
      case "disconnected":
      case "blocked":
        return {
          color: "bg-red-500",
          bg: "bg-red-50",
          text: "text-red-600",
          icon: <XCircle size={20} />,
        };
      case "pending":
      default:
        return {
          color: "bg-yellow-500",
          bg: "bg-yellow-50",
          text: "text-yellow-600",
          icon: <AlertCircle size={20} />,
        };
    }
  };

  if (!user) return <div>Loading...</div>;

  const verification = user.verification || {};

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Profile Management</h1>
        <p className="text-sm text-gray-500">Manage your pharmacy information and settings</p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 max-w-sm">
        {["info", "security", "verification"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setNotification(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "info"
              ? "Pharmacy Information"
              : tab === "security"
              ? "Security"
              : "Verification Status"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
        {notification && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}

        {activeTab === "info" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pharmacy Details</h2>
                <p className="text-sm text-gray-500">Update your pharmacy information</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                name="pharmacyName"
                label="Pharmacy Name"
                value={formData.pharmacyName}
                onChange={handleChange}
                icon={<Building size={16} />}
              />

              <Input
                label="Email Address"
                defaultValue={user.email}
                icon={<Mail size={16} />}
                disabled
                className="opacity-75"
              />

              <Input
                name="contactNumber"
                label="Contact Number"
                value={formData.contactNumber}
                onChange={handleChange}
                icon={<Phone size={16} />}
                maxLength={11}
              />

              <div>
                <Input
                  label="License ID"
                  defaultValue={user.licenseId || user.licenseNumber}
                  icon={<FileBadge size={16} />}
                  disabled
                  className="opacity-75"
                />
                <p className="text-[10px] text-gray-400 mt-1">License ID cannot be changed</p>
              </div>

              <div className="md:col-span-2">
                <LocationAutocompleteInput
                  label="Address"
                  value={formData.address}
                  onChange={handleAddressChange}
                  onLocationSelect={handleLocationSelect}
                  placeholder="Search new pharmacy address"
                  icon={<MapPin size={16} />}
                  helperText={
                    isValidLngLat(formData.location?.coordinates)
                      ? "✓ Address coordinates selected and ready to update"
                      : "Select address from suggestions so coordinates can be updated"
                  }
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Operating Hours</label>
                <input
                  type="text"
                  name="operatingHours"
                  value={formData.operatingHours}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-lg">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
            </div>
            <div className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                icon={<Lock size={16} />}
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                icon={<Lock size={16} />}
              />
              <Input
                label="Confirm New Password"
                name="confirmNewPassword"
                type="password"
                placeholder="Re-enter new password"
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange}
                icon={<Lock size={16} />}
              />
              <div className="pt-4">
                <Button onClick={handleUpdatePassword} disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "verification" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Verification Status</h2>
              <p className="text-sm text-gray-500">Your pharmacy verification and compliance status from the Admin.</p>
            </div>

            <div className="space-y-4">
              {(() => {
                const status = user.status || verification.adminApproval || "pending";
                const config = getStatusConfig(status);
                return (
                  <div className={`flex items-center p-4 border rounded-lg ${config.bg} border-gray-100`}>
                    <div className={`p-2 rounded-full mr-4 ${config.bg} ${config.text}`}>
                      <Shield size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">Admin Approval</h4>
                      <p className="text-xs text-gray-600">
                        Current status: <span className="font-medium capitalize">{status}</span>
                      </p>
                    </div>
                    <span className={`${config.color} text-white text-xs font-bold px-3 py-1 rounded-full capitalize`}>
                      {status}
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const status = verification.licenseStatus || user.status || "pending";
                const config = getStatusConfig(status);
                return (
                  <div className={`flex items-center p-4 border rounded-lg ${config.bg} border-gray-100`}>
                    <div className={`p-2 rounded-full mr-4 ${config.bg} ${config.text}`}>
                      <FileBadge size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">License Verification</h4>
                      <p className="text-xs text-gray-600">License ID: {user.licenseId || user.licenseNumber}</p>
                    </div>
                    <span className={`${config.color} text-white text-xs font-bold px-3 py-1 rounded-full capitalize`}>
                      {status}
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const status = verification.ersNetworkStatus || (user.status === "active" ? "connected" : "disconnected");
                const config = getStatusConfig(status);
                return (
                  <div className={`flex items-center p-4 border rounded-lg ${config.bg} border-gray-100`}>
                    <div className={`p-2 rounded-full mr-4 ${config.bg} ${config.text}`}>
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">ERS Network Status</h4>
                      <p className="text-xs text-gray-600">Connection to Emergency Response System</p>
                    </div>
                    <span className={`${config.color} text-white text-xs font-bold px-3 py-1 rounded-full capitalize`}>
                      {status}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Last review: {verification.lastReviewAt ? new Date(verification.lastReviewAt).toLocaleDateString() : "System Check"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
