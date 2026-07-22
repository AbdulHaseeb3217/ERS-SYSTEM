import React, { useState, useEffect } from 'react';
// Agar constants file nahi mil rahi toh ye line crash karegi
import * as Constants from '../../constants'; 
import { login } from '../services/authService';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('a.haseeb3127@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Troubleshooting: Check if constants are loading
  useEffect(() => {
    console.log("Login Component Mounted");
    if (!Constants.ERSLogo) {
      console.warn("ERSLogo component missing in constants file!");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(email, password);
      if (data && data.user && typeof onLoginSuccess === 'function') {
        onLoginSuccess(data.user); 
      } else {
        throw new Error("Invalid response or missing login handler.");
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Server connection failed. Is your backend running on port 5000?');
      } else {
        setError(err.message || 'Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe logo rendering logic
  const renderLogo = () => {
    if (Constants.ERSLogo) {
      return <Constants.ERSLogo size={64} className="mx-auto mb-6" />;
    }
    return <div className="w-16 h-16 bg-red-600 rounded-lg mx-auto mb-6 flex items-center justify-center text-white font-bold">ERS</div>;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        {renderLogo()}
        <h1 className="text-base font-medium text-gray-800">Emergency Response System</h1>
        <p className="text-sm text-gray-500 mt-1">Admin Portal</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 p-7">
        <div className="text-left">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Admin Login</h2>
          <p className="text-[11px] text-gray-400 font-bold mb-6">Enter your credentials to access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-xs font-bold"
              required
            />
          </div>

          <div className="text-left">
            <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-xs font-bold"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
               <p className="text-[10px] text-red-600 font-bold text-left">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#e10000] text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors disabled:opacity-70 mt-4 shadow-lg active:scale-[0.98]"
          >
            {loading ? 'Validating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;