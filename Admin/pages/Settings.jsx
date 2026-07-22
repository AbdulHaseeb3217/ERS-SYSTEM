import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { User as UserIcon, Lock, CheckCircle, AlertCircle, Phone, Mail, Fingerprint, ChevronDown, ChevronRight, Loader } from 'lucide-react';
import { updateAdminProfileApi, changeAdminPasswordApi } from '../services/adminApi';

const Settings = ({ user, onLogout, onSetActivePage }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Form States
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '' 
      });
    }
  }, [user]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // ✅ FIXED: Sending Admin ID in payload
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!profileData.name.trim()) newErrors.name = true;
    
    if (Object.keys(newErrors).length > 0) {
      setProfileErrors(newErrors);
      showNotification('error', 'Name is required!');
      return;
    }

    // Check if user ID exists
    if (!user || !user.id) {
      showNotification('error', 'User ID missing. Please login again.');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ Sending ID manually now
      const res = await updateAdminProfileApi({
        id: user.id, 
        name: profileData.name,
        phone: profileData.phone
      });

      // Update Local Storage immediately so UI updates without refresh
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...storedUser, name: res.user.name, phone: res.user.phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setProfileErrors({});
      showNotification('success', res.message || 'Profile information updated successfully!');
    } catch (error) {
      console.error("Profile Update Error:", error);
      const msg = error.response?.data?.message || 'Update failed.';
      showNotification('error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Sending Admin ID in payload
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!passwordData.currentPassword.trim()) newErrors.currentPassword = true;
    if (!passwordData.newPassword.trim()) newErrors.newPassword = true;
    if (!passwordData.confirmPassword.trim()) newErrors.confirmPassword = true;

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      showNotification('error', 'Please fill in all password fields!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = true;
      setPasswordErrors(newErrors);
      showNotification('error', 'New password must be at least 6 characters long!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = true;
      setPasswordErrors(newErrors);
      showNotification('error', 'New passwords do not match!');
      return;
    }

    // Check if user ID exists
    if (!user || !user.id) {
      showNotification('error', 'User ID missing. Please login again.');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ Sending ID manually now
      const res = await changeAdminPasswordApi({
        id: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordErrors({});
      showNotification('success', res.message || 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Password Update Error:", error);
      const msg = error.response?.data?.message || 'Password change failed.';
      showNotification('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen">
      <Sidebar activeTab="settings" onLogout={onLogout} onTabClick={onSetActivePage} />
      
      <main className="flex-1 ml-64 p-8">
        {notification && (
          <div className={`fixed top-6 right-6 z-[250] flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        )}

        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Settings</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Emergency Response System Admin Panel</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-gray-400 font-medium">{user?.email || 'admin@ers.com'}</p>
            </div>
            <div className="w-8 h-8 bg-[#e10000] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
              {(user?.name?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        <div className="w-full max-w-4xl space-y-4">
          
          {/* Profile Section */}
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${activeSection === 'profile' ? 'ring-1 ring-red-100' : 'hover:border-gray-200'}`}>
            <button onClick={() => setActiveSection('profile')} className={`w-full p-6 flex items-center justify-between transition-colors ${activeSection === 'profile' ? 'bg-red-50/30' : 'bg-white'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${activeSection === 'profile' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}><UserIcon size={20} /></div>
                <div className="text-left"><h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Profile Information</h3><p className="text-[10px] text-gray-400 font-medium mt-0.5">Manage your personal and contact details</p></div>
              </div>
              {activeSection === 'profile' ? <ChevronDown size={20} className="text-red-500" /> : <ChevronRight size={20} className="text-gray-300" />}
            </button>

            {activeSection === 'profile' && (
              <div className="p-8 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-left">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <Fingerprint size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} className={`w-full pl-11 pr-5 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none`} />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="email" value={profileData.email} disabled className="w-full pl-11 pr-5 py-3.5 bg-gray-100 border border-gray-100 rounded-xl text-xs font-bold text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-widest">Phone Number</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="text" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} placeholder="+92 300 1234567" className={`w-full pl-11 pr-5 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none`} />
                    </div>
                  </div>
                  <div className="col-span-2 pt-4">
                    <button type="submit" disabled={loading} className="px-10 py-4 bg-[#e10000] text-white text-[11px] font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 active:scale-95 uppercase tracking-[0.2em]">
                      {loading ? <Loader size={14} className="animate-spin" /> : 'Update Profile Info'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${activeSection === 'password' ? 'ring-1 ring-gray-200' : 'hover:border-gray-200'}`}>
            <button onClick={() => setActiveSection('password')} className={`w-full p-6 flex items-center justify-between transition-colors ${activeSection === 'password' ? 'bg-gray-50/50' : 'bg-white'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${activeSection === 'password' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}><Lock size={20} /></div>
                <div className="text-left"><h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Change Password</h3><p className="text-[10px] text-gray-400 font-medium mt-0.5">Update your login security credentials</p></div>
              </div>
              {activeSection === 'password' ? <ChevronDown size={20} className="text-gray-800" /> : <ChevronRight size={20} className="text-gray-300" />}
            </button>

            {activeSection === 'password' && (
              <div className="p-8 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                <form onSubmit={handlePasswordUpdate} className="max-w-xl space-y-6 text-left">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-widest">Current Password</label>
                    <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-widest">New Password</label>
                    <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-widest">Confirm Password</label>
                    <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none" />
                  </div>
                  <div className="pt-4">
                    <button type="submit" disabled={loading} className="px-10 py-4 bg-gray-800 text-white text-[11px] font-bold rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 uppercase tracking-[0.2em]">
                      {loading ? <Loader size={14} className="animate-spin" /> : 'Change Account Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center gap-4 p-6 bg-blue-50/30 border border-blue-50 rounded-2xl max-w-4xl text-left">
           <div className="p-3 bg-white rounded-xl shadow-sm text-blue-500"><AlertCircle size={24} /></div>
           <div>
             <p className="text-xs font-bold text-gray-800 uppercase tracking-tight">Need help with account settings?</p>
             <p className="text-[10px] text-gray-400 font-bold mt-1">If you're having trouble updating your profile, please contact our system administrator at support@ers.com</p>
           </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;