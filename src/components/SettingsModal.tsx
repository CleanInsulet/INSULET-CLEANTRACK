import React, { useState, useRef } from 'react';
import { UserProfile, Zone, AuditLogItem } from '../types';
import { compressImage } from '../utils/imageCompressor';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Shield,
  IdCard,
  Calendar,
  Phone,
  Mail,
  Clock,
  Key,
  Save,
  X,
  Sparkles,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  MapPin,
  Plus
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  zones?: Zone[];
  auditLogs?: AuditLogItem[];
  onUpdateProfile: (updatedUser: UserProfile) => void;
  onUpdateOtherUser?: (updatedUser: UserProfile) => void;
  onRegisterUser?: (newUser: UserProfile) => void;
  onDeleteUser?: (userId: string) => void;
  onResetData?: () => void;
  onAddZone?: (zone: Zone) => void;
  onDeleteZone?: (zoneId: string) => void;
  onDeleteAuditLog?: (logId: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
];

const DEFAULT_AVATAR_PLACEHOLDER = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  zones = [],
  auditLogs = [],
  onUpdateProfile,
  onUpdateOtherUser,
  onRegisterUser,
  onDeleteUser,
  onResetData,
  onAddZone,
  onDeleteZone,
  onDeleteAuditLog,
}) => {
  // Navigation tabs: 'personal' | 'security'
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');

  // Form Fields - Personal
  const [name, setName] = useState(currentUser.name || '');
  const [icNumber, setIcNumber] = useState(currentUser.icNumber || '');
  const [dob, setDob] = useState(currentUser.dob || '1992-08-15');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || `${currentUser.id}@insulet.my`);
  const [avatar, setAvatar] = useState(currentUser.avatar || DEFAULT_AVATAR_PLACEHOLDER);

  // Form Fields - Account & Security
  const [username, setUsername] = useState(currentUser.username || currentUser.id);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form Fields - Manager Registration of New Staff Account
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'cleaner' | 'supervisor' | 'manager'>('cleaner');
  const [regShift, setRegShift] = useState<'day' | 'night'>('day');
  const [regZone, setRegZone] = useState('Main Lobby & Restrooms');
  const [regPhone, setRegPhone] = useState('');
  const [regEmpId, setRegEmpId] = useState('');
  const [regPassword, setRegPassword] = useState('123456');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // State for Deleting Left Workers
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Password Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Feedback States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailVerificationPending, setEmailVerificationPending] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password Strength Calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Not set', color: 'bg-slate-200', text: 'text-slate-400', width: 'w-0' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak (Requires 8+ chars, numbers or caps)', color: 'bg-rose-500', text: 'text-rose-600', width: 'w-1/4' };
      case 2:
        return { score: 2, label: 'Fair (Add special characters or numbers)', color: 'bg-amber-500', text: 'text-amber-600', width: 'w-2/4' };
      case 3:
        return { score: 3, label: 'Good (Strong password)', color: 'bg-blue-500', text: 'text-blue-600', width: 'w-3/4' };
      case 4:
      default:
        return { score: 4, label: 'Very Strong (Optimal protection)', color: 'bg-emerald-500', text: 'text-emerald-600', width: 'w-full' };
    }
  };

  const pwdStrength = getPasswordStrength(newPassword);

  // Photo Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 300, 300, 0.6);
        setAvatar(compressed);
        setSuccessMessage('New profile photo uploaded and previewed.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Avatar compression failed:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setAvatar(reader.result);
            setSuccessMessage('New profile photo uploaded.');
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemovePhoto = () => {
    setAvatar(DEFAULT_AVATAR_PLACEHOLDER);
    setSuccessMessage('Profile photo reset to standard default.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Validation Logic
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Full Name
    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    // 2. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // 3. Phone Validation
    const phoneClean = phone.replace(/[\s\-\+\(\)]/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (phoneClean.length < 8 || !/^\d+$/.test(phoneClean)) {
      newErrors.phone = 'Phone number must contain at least 8 digits.';
    }

    // 4. IC Validation
    const icClean = icNumber.replace(/[\s\-]/g, '');
    if (!icNumber.trim()) {
      newErrors.icNumber = 'IC / Identification number is required.';
    } else if (icClean.length < 6 || !/^[A-Za-z0-9]+$/.test(icClean)) {
      newErrors.icNumber = 'IC number format invalid (e.g., 920815-14-5321).';
    }

    // 5. Password Changes (If user filled any password fields)
    if (newPassword || confirmPassword || currentPassword) {
      const activePassword = currentUser.password || '123456';
      if (!currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password.';
      } else if (currentPassword !== activePassword) {
        newErrors.currentPassword = 'Current password is incorrect.';
      }

      if (!newPassword) {
        newErrors.newPassword = 'New password is required.';
      } else if (newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters long.';
      }
      if (confirmPassword !== newPassword) {
        newErrors.confirmPassword = 'Confirm password does not match new password.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save Changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check if email was changed
    if (email !== (currentUser.email || '')) {
      setEmailVerificationPending(`Verification email sent to ${email}. Please check your inbox.`);
    } else {
      setEmailVerificationPending(null);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedPassword = newPassword ? newPassword : (currentUser.password || '123456');

    const updatedUser: UserProfile = {
      ...currentUser,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      icNumber: icNumber.trim(),
      dob: dob.trim(),
      avatar: avatar,
      username: username.trim(),
      password: updatedPassword,
      lastProfileUpdateDate: todayStr,
    };

    onUpdateProfile(updatedUser);
    setSuccessMessage('Profile and account credentials updated successfully! Use these new credentials to log in.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Handle Register Staff Account (Manager Feature)
  const handleRegisterStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim()) {
      setRegError('Please enter full name.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Please enter official email address or username.');
      return;
    }

    const newUserId = `usr-${Date.now()}`;
    const newStaff: UserProfile = {
      id: newUserId,
      name: regName.trim(),
      role: regRole,
      avatar:
        regRole === 'cleaner'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      phone: regPhone.trim() || '+60 12-345 6789',
      assignedZone: regZone || 'Main Lobby & Restrooms',
      username: regEmail.split('@')[0],
      email: regEmail.includes('@') ? regEmail : `${regEmail}@insulet.my`,
      employeeId: regEmpId.trim() || `EMP-${regRole.toUpperCase().slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`,
      department: regRole === 'cleaner' ? 'Sanitation & Hygiene Services' : 'Facilities Management',
      position: regRole === 'cleaner' ? 'Hygiene Specialist' : regRole === 'supervisor' ? 'Shift Inspector' : 'Facility Manager',
      managerName: `${currentUser.name} (${currentUser.position || 'Facility Lead'})`,
      accessLevel: regRole === 'cleaner' ? 'Level 1 - Field Operations Staff' : 'Level 3 - Shift Inspector',
      assignedShift: regRole === 'cleaner' ? regShift : 'flexible',
      accountCreatedDate: new Date().toISOString().split('T')[0],
      lastLoginDate: 'Never logged in',
      password: regPassword || '123456',
    };

    if (onRegisterUser) {
      onRegisterUser(newStaff);
    }

    const cleanerCount = allUsers.filter((u) => u.role === 'cleaner').length + (regRole === 'cleaner' ? 1 : 0);
    setRegSuccess(`🎉 New employee account created for ${newStaff.name} (${newStaff.position})! Cleaner team count is now ${cleanerCount}. System timetables, duty boards, and assignment dropdowns have been updated dynamically.`);

    // Reset form
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegEmpId('');
    setRegPassword('123456');
  };

  // Handle Delete Worker (Manager Feature for Departed / Left Workers)
  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    const deletedName = userToDelete.name;
    const deletedRole = userToDelete.role;

    if (onDeleteUser) {
      onDeleteUser(userToDelete.id);
    }

    const remainingCleaners = allUsers.filter((u) => u.role === 'cleaner' && u.id !== userToDelete.id).length;
    setRegSuccess(`🗑️ Employee account for ${deletedName} (${deletedRole.toUpperCase()}) has been deleted from the facility system. Active cleaner count updated to ${remainingCleaners}.`);
    setUserToDelete(null);
  };

  // Cancel Changes
  const handleReset = () => {
    setName(currentUser.name || '');
    setIcNumber(currentUser.icNumber || '');
    setDob(currentUser.dob || '1992-08-15');
    setPhone(currentUser.phone || '');
    setEmail(currentUser.email || '');
    setAvatar(currentUser.avatar || DEFAULT_AVATAR_PLACEHOLDER);
    setUsername(currentUser.username || currentUser.id);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setSuccessMessage(null);
    setEmailVerificationPending(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      
      {/* Backdrop Click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Settings Card */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Card Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Account Settings & User Profile
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Manage personal credentials, profile picture, and account security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-2 bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'personal'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Account & Security</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Global Alert Banners */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {emailVerificationPending && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{emailVerificationPending}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL INFORMATION & PHOTO MANAGEMENT */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              
              {/* Profile Photo Card */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                    title="Upload new avatar photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">Profile Photo Management</h4>
                  <p className="text-xs text-slate-500">
                    Upload a custom picture (PNG, JPG up to 5MB) or select from avatar presets.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Photo
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  {/* Preset Quick Chooser */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Quick Presets:
                    </span>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      {AVATAR_PRESETS.map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(presetUrl)}
                          className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-transform ${
                            avatar === presetUrl ? 'border-indigo-600 scale-110 shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Details Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                      errors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                    }`}
                    placeholder="Enter full legal name"
                  />
                  {errors.name && <p className="text-[10px] text-rose-600 font-semibold">{errors.name}</p>}
                </div>

                {/* IC / Identification Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-indigo-600" /> IC / Identification No. *
                  </label>
                  <input
                    type="text"
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                      errors.icNumber ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                    }`}
                    placeholder="e.g. 920815-14-5321"
                  />
                  {errors.icNumber && <p className="text-[10px] text-rose-600 font-semibold">{errors.icNumber}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> Phone Number *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                      errors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                    }`}
                    placeholder="e.g. +60 12-345 6789"
                  />
                  {errors.phone && <p className="text-[10px] text-rose-600 font-semibold">{errors.phone}</p>}
                </div>

                {/* Email Address (Spans 2 columns) */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Official Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                      errors.email ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                    }`}
                    placeholder="e.g. user@insulet.my"
                  />
                  {errors.email ? (
                    <p className="text-[10px] text-rose-600 font-semibold">{errors.email}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Modifying your email address will trigger an automated verification email.
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT SETTINGS & PASSWORD SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Username Settings */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" /> Account Identity
                </h4>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">System Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter login username"
                  />
                  <p className="text-[10px] text-slate-400">Used for single sign-on (SSO) and portal login authentication.</p>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" /> Change Security Password
                </h4>
                
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Current Password *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Required for security confirmation</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full px-3 py-2 pr-10 bg-white border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.currentPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && <p className="text-[10px] text-rose-600 font-semibold">{errors.currentPassword}</p>}
                </div>

                {/* New Password & Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  
                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">New Password (Min 8 Chars)</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full px-3 py-2 pr-10 bg-white border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.newPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                        }`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.newPassword && <p className="text-[10px] text-rose-600 font-semibold">{errors.newPassword}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-3 py-2 pr-10 bg-white border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.confirmPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                        }`}
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-rose-600 font-semibold">{errors.confirmPassword}</p>}
                  </div>

                </div>

                {/* Password Strength Indicator Meter */}
                {newPassword && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Password Strength Rating:</span>
                      <span className={`font-black ${pwdStrength.text}`}>{pwdStrength.label}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${pwdStrength.color} ${pwdStrength.width}`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      {/* Worker Deletion Confirmation Overlay */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-rose-200 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>

            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete Employee Account?
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Confirm permanent removal of left/departed staff member from facility systems.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <img src={userToDelete.avatar} alt={userToDelete.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                <div>
                  <div className="font-extrabold text-slate-900">{userToDelete.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Position: <strong className="text-indigo-700">{userToDelete.position || userToDelete.role}</strong> • ID: {userToDelete.employeeId || userToDelete.id}
                  </div>
                  <div className="text-[10px] text-slate-400">Assigned Zone: {userToDelete.assignedZone || 'Main Facility'}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed font-medium">
                ⚠️ <strong>System Impact:</strong> Deleting <strong>{userToDelete.name}</strong> will remove them from the active staff roster, revoke login permissions, and update cleaner team counts and timetable allocations.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel Keep Account
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Left Worker</span>
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Form Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
            {currentUser.role === 'manager' && onResetData && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to seed the database with demo data?')) {
                    onResetData();
                    alert('Demo data restored!');
                  }
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Database
              </button>
            )}
            <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel Changes
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
