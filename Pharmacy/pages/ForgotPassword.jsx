import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

export const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  
  // New Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Step 1: Verify Email
  const handleSendLink = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if email exists in DB
      await authService.verifyEmail(email);
      setStep(2); // Move to next step if email is valid
    } catch (err) {
      setError(err.message || "Email not found in our records.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Call API to update password
      await authService.resetPassword(email, newPassword);
      
      alert("Password reset successfully. Please login with new password.");
      navigate('/pharmacy/login');
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      {/* Back Button */}
      <div className="w-full max-w-md mb-6">
        <Link to="/pharmacy/login" className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium">
          <ArrowLeft size={16} className="mr-1" /> Back to Login
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 md:p-10">
        
        {/* Error Message */}
        {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100 font-medium">
                {error}
            </div>
        )}

        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-500 text-sm mb-8">
              Enter your registered email below to find your account.
            </p>

            <form onSubmit={handleSendLink} className="space-y-6">
              <Input 
                label="Email address" 
                type="email"
                placeholder="pharmacy@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Verifying...' : 'FIND ACCOUNT'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h1>
            <p className="text-gray-500 text-sm mb-8">
              Create a strong new password for {email}
            </p>

            <form onSubmit={handleReset} className="space-y-6">
              <Input 
                label="New password" 
                type="password"
                placeholder="Enter new password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input 
                label="Confirm password" 
                type="password"
                placeholder="Re-enter new password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Updating...' : 'RESET PASSWORD'}
              </Button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-6">
              Tip: use at least 6 characters with a mix of letters and numbers.
            </p>
          </>
        )}
      </div>
    </div>
  );
};