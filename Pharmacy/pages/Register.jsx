import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { LocationAutocompleteInput } from "../components/LocationAutocompleteInput";
import { Mail, Lock, Building, Phone, FileBadge, MapPin } from "lucide-react";
import { authService } from "../services/authService";
import {
  getBrowserLocation,
  isValidLngLat,
  makePointLocation,
  reverseGeocodeCoords,
} from "../utils/locationUtils";

export const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");

  const [formData, setFormData] = useState({
    pharmacyName: "",
    email: "",
    contactNumber: "",
    licenseId: "",
    address: "",
    location: null,
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadCurrentAddress = async () => {
      try {
        setLocationLoading(true);
        setLocationError("");

        const coords = await getBrowserLocation();
        if (cancelled) return;

        const address = await reverseGeocodeCoords(coords);
        if (cancelled) return;

        setFormData((prev) => ({
          ...prev,
          address: address || "Current GPS location",
          location: makePointLocation(coords.longitude, coords.latitude),
        }));
      } catch (err) {
        if (!cancelled) {
          setLocationError(
            "Current location not loaded. Please allow location permission or select address from suggestions."
          );
        }
      } finally {
        if (!cancelled) setLocationLoading(false);
      }
    };

    loadCurrentAddress();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (address) => {
    setFormData((prev) => ({
      ...prev,
      address,
      // Important: user typed manually, coordinates are now stale until a suggestion is selected
      location: null,
    }));
  };

  const handleLocationSelect = (result) => {
    setFormData((prev) => ({
      ...prev,
      address: result.address,
      location: result.location,
    }));
    setLocationError("");
  };

  const handleLicenseChange = (e) => {
    let val = e.target.value.replace(/\//g, "").toUpperCase();
    val = val.replace(/[^A-Z0-9]/g, "");

    if (val.length > 10) val = val.slice(0, 10);

    let formattedValue = "";

    if (val.length > 0) formattedValue = val.slice(0, 3);
    if (val.length > 3) formattedValue += "/" + val.slice(3, 8);
    if (val.length > 8) formattedValue += "/" + val.slice(8, 10);

    setFormData({ ...formData, licenseId: formattedValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nameRegex = /^[A-Za-z\s.-]+$/;
    if (!nameRegex.test(formData.pharmacyName)) {
      setError("Pharmacy Name must contain only alphabets, spaces, dots (.), or hyphens (-). ");
      return;
    }

    if (/^[-.]|[-.]$/.test(formData.pharmacyName)) {
      setError("Pharmacy Name cannot start or end with a dot (.) or hyphen (-). ");
      return;
    }

    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      setError("Invalid Email Address.");
      return;
    }

    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(formData.contactNumber)) {
      setError("Contact Number must be exactly 11 digits.");
      return;
    }

    const licenseRegex = /^[A-Z]{3}\/\d{5}\/\d{2}$/;
    if (!licenseRegex.test(formData.licenseId)) {
      setError("Invalid License. Complete the format: ABC/12345/25");
      return;
    }

    if (!formData.address.trim()) {
      setError("Pharmacy address is required.");
      return;
    }

    if (!isValidLngLat(formData.location?.coordinates)) {
      setError("Please select a valid pharmacy address from location suggestions or allow current location.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...dataToSend } = formData;
      await authService.register(dataToSend);
      alert("Registration Successful! Redirecting to login...");
      navigate("/pharmacy/login");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 01-2-2h-4a2 2 0 01-2 2v2m2-4h.01M17 16l-3-3m0 0l-3 3m3-3V9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your Pharmacy</h1>
          <p className="text-gray-500 mt-2 text-center text-sm">
            Join the Emergency Response System (ERS) network
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100 font-medium">
            {error}
          </div>
        )}

        {locationError && (
          <div className="mb-6 p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-100 font-medium">
            {locationError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <Input
              label="Pharmacy Name *"
              name="pharmacyName"
              value={formData.pharmacyName}
              onChange={handleChange}
              placeholder="e.g. City Pharmacy"
              icon={<Building size={18} />}
              required
            />

            <Input
              label="Email Address *"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="pharmacy@example.com"
              icon={<Mail size={18} />}
              required
            />

            <Input
              label="Contact Number *"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              placeholder="03001234567"
              icon={<Phone size={18} />}
              required
              maxLength={11}
            />

            <Input
              label="License ID *"
              name="licenseId"
              value={formData.licenseId}
              onChange={handleLicenseChange}
              placeholder="PPC/12345/25"
              icon={<FileBadge size={18} />}
              required
              maxLength={12}
            />

            <div className="md:col-span-2">
              <LocationAutocompleteInput
                label="Address"
                value={formData.address}
                onChange={handleAddressChange}
                onLocationSelect={handleLocationSelect}
                placeholder={locationLoading ? "Getting current GPS address..." : "Search or select pharmacy address"}
                icon={<MapPin size={18} />}
                helperText={
                  locationLoading
                    ? "Getting current location address..."
                    : isValidLngLat(formData.location?.coordinates)
                    ? "✓ Address coordinates selected and ready to save"
                    : "Select address from suggestions so coordinates can be saved"
                }
                required
              />
            </div>

            <Input
              label="Password *"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              icon={<Lock size={18} />}
              required
            />

            <Input
              label="Confirm Password *"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              icon={<Lock size={18} />}
              required
            />
          </div>

          <div className="mt-6">
            <Button type="submit" fullWidth disabled={loading || locationLoading}>
              {loading ? "Creating Account..." : "Register Pharmacy"}
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/pharmacy/login" className="text-blue-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
