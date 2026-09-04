import React, { useState, useRef } from 'react';
import { UserProfile, Zone, ToolItem, UserRole } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { 
  Users, 
  MapPin, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Camera, 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  Filter,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpDown,
  Loader2
} from 'lucide-react';

interface ITDashboardProps {
  allUsers: UserProfile[];
  zones: Zone[];
  tools: ToolItem[];
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onReorderUsers?: (users: UserProfile[]) => void;
  onAddZone: (zone: Zone) => void;
  onUpdateZone: (zone: Zone) => void;
  onDeleteZone: (zoneId: string) => void;
  onReorderZones?: (zones: Zone[]) => void;
  onAddTool: (tool: ToolItem) => void;
  onUpdateTool: (tool: ToolItem) => void;
  onDeleteTool: (toolId: string) => void;
  onReorderTools?: (tools: ToolItem[]) => void;
}

export const ITDashboard: React.FC<ITDashboardProps> = ({
  allUsers = [], zones = [], tools = [], currentUser,
  onUpdateUser, onDeleteUser, onReorderUsers,
  onAddZone, onUpdateZone, onDeleteZone, onReorderZones,
  onAddTool, onUpdateTool, onDeleteTool, onReorderTools
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'zones' | 'tools'>('users');

  // USER MGMT STATE
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<Partial<UserProfile>>({});
  const [userRoleCategory, setUserRoleCategory] = useState<'all' | 'it' | 'mgmt' | 'dayshift' | 'nightshift'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId] = useState<string | null>(null);

  // ZONE MGMT STATE
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editZoneData, setEditZoneData] = useState<Partial<Zone>>({});
  const [draggedZoneId, setDraggedZoneId] = useState<string | null>(null);
  const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null);

  // TOOL MGMT STATE
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolData, setEditToolData] = useState<Partial<ToolItem>>({});
  const [isCompressingToolPhoto, setIsCompressingToolPhoto] = useState(false);
  const [draggedToolId, setDraggedToolId] = useState<string | null>(null);
  const [dragOverToolId, setDragOverToolId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DELETION CONFIRMATION STATES
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);
  const [deletingToolId, setDeletingToolId] = useState<string | null>(null);

  const startEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    const currentAssignedZones = user.assignedZones && user.assignedZones.length > 0
      ? user.assignedZones
      : (user.assignedZone ? [user.assignedZone] : []);
    setEditUserData({ ...user, assignedZones: currentAssignedZones });
  };
  const saveEditUser = () => {
    if (editingUserId && editUserData.name) {
      const assignedList = editUserData.assignedZones || [];
      const primaryZone = assignedList.length > 0 ? assignedList.join(', ') : (editUserData.assignedZone || '');
      onUpdateUser({
        ...editUserData,
        assignedZones: assignedList,
        assignedZone: primaryZone,
      } as UserProfile);
      setEditingUserId(null);
    }
  };

  const startEditZone = (zone: Zone) => {
    setEditingZoneId(zone.id);
    setEditZoneData({ ...zone });
  };
  const saveEditZone = () => {
    if (editingZoneId && editZoneData.name) {
      onUpdateZone(editZoneData as Zone);
      setEditingZoneId(null);
    }
  };

  const startEditTool = (tool: ToolItem) => {
    setEditingToolId(tool.id);
    setEditToolData({ ...tool });
  };
  const saveEditTool = async () => {
    if (editingToolId && editToolData.name) {
      let finalTool = { ...editToolData } as ToolItem;
      // Guarantee tool image is compressed under Firestore document limits
      if (finalTool.imageUrl && finalTool.imageUrl.startsWith('data:') && finalTool.imageUrl.length > 200000) {
        try {
          finalTool.imageUrl = await compressImage(finalTool.imageUrl, 400, 400, 0.6);
        } catch (err) {
          console.warn('Fallback tool image compression error:', err);
        }
      }
      onUpdateTool(finalTool);
      setEditingToolId(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressingToolPhoto(true);
      try {
        // High efficiency compression: 400x400 max, 0.6 quality (typically 15-30KB)
        const compressedDataUrl = await compressImage(file, 400, 400, 0.6);
        setEditToolData(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      } catch (err) {
        console.error('Failed to compress tool image:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditToolData(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingToolPhoto(false);
      }
    }
  };

  // Reordering helpers for users
  const handleMoveUserUp = (index: number, userList: UserProfile[], e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index <= 0) return;
    const newUsers = [...userList];
    const temp = newUsers[index - 1];
    newUsers[index - 1] = newUsers[index];
    newUsers[index] = temp;

    const reordered = newUsers.map((u, idx) => ({ ...u, orderIndex: idx }));
    onReorderUsers?.(reordered);
  };

  const handleMoveUserDown = (index: number, userList: UserProfile[], e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index >= userList.length - 1) return;
    const newUsers = [...userList];
    const temp = newUsers[index + 1];
    newUsers[index + 1] = newUsers[index];
    newUsers[index] = temp;

    const reordered = newUsers.map((u, idx) => ({ ...u, orderIndex: idx }));
    onReorderUsers?.(reordered);
  };

  const handleDropOnUser = (targetUserId: string, userList: UserProfile[]) => {
    if (!draggedUserId || draggedUserId === targetUserId) {
      setDraggedUserId(null);
      setDragOverUserId(null);
      return;
    }
    const fromIndex = userList.findIndex((u) => u.id === draggedUserId);
    const toIndex = userList.findIndex((u) => u.id === targetUserId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newUsers = [...userList];
    const [movedItem] = newUsers.splice(fromIndex, 1);
    newUsers.splice(toIndex, 0, movedItem);

    const reordered = newUsers.map((u, idx) => ({ ...u, orderIndex: idx }));
    onReorderUsers?.(reordered);
    setDraggedUserId(null);
    setDragOverUserId(null);
  };

  // Reordering helpers for Zones
  const handleMoveZoneUp = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index <= 0) return;
    const newZones = [...zones];
    const temp = newZones[index - 1];
    newZones[index - 1] = newZones[index];
    newZones[index] = temp;
    const reordered = newZones.map((z, idx) => ({ ...z, orderIndex: idx }));
    onReorderZones?.(reordered);
  };

  const handleMoveZoneDown = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index >= zones.length - 1) return;
    const newZones = [...zones];
    const temp = newZones[index + 1];
    newZones[index + 1] = newZones[index];
    newZones[index] = temp;
    const reordered = newZones.map((z, idx) => ({ ...z, orderIndex: idx }));
    onReorderZones?.(reordered);
  };

  const handleDropOnZone = (targetZoneId: string) => {
    if (!draggedZoneId || draggedZoneId === targetZoneId) {
      setDraggedZoneId(null);
      setDragOverZoneId(null);
      return;
    }
    const fromIndex = zones.findIndex((z) => z.id === draggedZoneId);
    const toIndex = zones.findIndex((z) => z.id === targetZoneId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newZones = [...zones];
    const [movedItem] = newZones.splice(fromIndex, 1);
    newZones.splice(toIndex, 0, movedItem);

    const reordered = newZones.map((z, idx) => ({ ...z, orderIndex: idx }));
    onReorderZones?.(reordered);
    setDraggedZoneId(null);
    setDragOverZoneId(null);
  };

  // Reordering helpers for Tools
  const handleMoveToolUp = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index <= 0) return;
    const newTools = [...tools];
    const temp = newTools[index - 1];
    newTools[index - 1] = newTools[index];
    newTools[index] = temp;
    const reordered = newTools.map((t, idx) => ({ ...t, orderIndex: idx }));
    onReorderTools?.(reordered);
  };

  const handleMoveToolDown = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index >= tools.length - 1) return;
    const newTools = [...tools];
    const temp = newTools[index + 1];
    newTools[index + 1] = newTools[index];
    newTools[index] = temp;
    const reordered = newTools.map((t, idx) => ({ ...t, orderIndex: idx }));
    onReorderTools?.(reordered);
  };

  const handleDropOnTool = (targetToolId: string) => {
    if (!draggedToolId || draggedToolId === targetToolId) {
      setDraggedToolId(null);
      setDragOverToolId(null);
      return;
    }
    const fromIndex = tools.findIndex((t) => t.id === draggedToolId);
    const toIndex = tools.findIndex((t) => t.id === targetToolId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newTools = [...tools];
    const [movedItem] = newTools.splice(fromIndex, 1);
    newTools.splice(toIndex, 0, movedItem);

    const reordered = newTools.map((t, idx) => ({ ...t, orderIndex: idx }));
    onReorderTools?.(reordered);
    setDraggedToolId(null);
    setDragOverToolId(null);
  };

  return (
    <div className="w-full bg-slate-50 p-3 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in pb-28">
      <div className="flex items-center gap-3 sm:gap-4 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate">IT Administration</h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Global System & Operations Configuration</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        <button onClick={() => setActiveTab('users')} className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
          <Users className="w-4 h-4" /> Users ({allUsers.length})
        </button>
        <button onClick={() => setActiveTab('zones')} className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer ${activeTab === 'zones' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
          <MapPin className="w-4 h-4" /> Areas & Zones ({zones.length})
        </button>
        <button onClick={() => setActiveTab('tools')} className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer ${activeTab === 'tools' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
          <ClipboardList className="w-4 h-4" /> Work Items ({tools.length})
        </button>
      </div>

      <div className="bg-white p-3.5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 sm:space-y-6">
        {activeTab === 'users' && (() => {
          const countIt = allUsers.filter(u => u.role === 'it' || (u.role as string) === 'it_admin').length;
          const countMgmt = allUsers.filter(u => u.role === 'manager' || u.role === 'administrator' || u.role === 'supervisor').length;
          const countDay = allUsers.filter(u => u.role === 'cleaner' && (u.assignedShift === 'day' || !u.assignedShift)).length;
          const countNight = allUsers.filter(u => u.role === 'cleaner' && u.assignedShift === 'night').length;

          // Filter users
          const filteredUsers = allUsers.filter(user => {
            const matchesSearch = !userSearchQuery || 
              user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
              (user.employeeId && user.employeeId.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
              (user.username && user.username.toLowerCase().includes(userSearchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (userRoleCategory === 'it') {
              return user.role === 'it' || (user.role as string) === 'it_admin';
            }
            if (userRoleCategory === 'mgmt') {
              return user.role === 'manager' || user.role === 'administrator' || user.role === 'supervisor';
            }
            if (userRoleCategory === 'dayshift') {
              return user.role === 'cleaner' && (user.assignedShift === 'day' || !user.assignedShift);
            }
            if (userRoleCategory === 'nightshift') {
              return user.role === 'cleaner' && user.assignedShift === 'night';
            }
            return true;
          });

          // Sort by orderIndex if present
          const sortedFilteredUsers = [...filteredUsers].sort((a, b) => {
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
            if (a.orderIndex !== undefined) return -1;
            if (b.orderIndex !== undefined) return 1;
            return 0;
          });

          return (
            <div className="space-y-4">
              {/* Header & Add user */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    Employee Accounts
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {sortedFilteredUsers.length} of {allUsers.length} staff
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => {
                      const newUser: UserProfile = {
                        id: `usr-${Date.now()}`,
                        name: 'New User',
                        role: 'cleaner',
                        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=250',
                        password: 'password123',
                        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                        username: `user${Math.floor(100 + Math.random() * 900)}`,
                        assignedShift: 'day',
                        assignedZones: [],
                        status: 'active',
                        orderIndex: allUsers.length
                      };
                      onUpdateUser(newUser);
                    }}
                    className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-800 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
              </div>

              {/* FILTER & SEARCH & REORDER TOOLBAR */}
              <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, employee ID, or username..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  {userSearchQuery && (
                    <button 
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Role/Shift Category Filter Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    
                    <button
                      onClick={() => setUserRoleCategory('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        userRoleCategory === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Accounts
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userRoleCategory === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {allUsers.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setUserRoleCategory('it')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        userRoleCategory === 'it'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100'
                      }`}
                    >
                      IT Master
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userRoleCategory === 'it' ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-800'}`}>
                        {countIt}
                      </span>
                    </button>

                    <button
                      onClick={() => setUserRoleCategory('mgmt')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        userRoleCategory === 'mgmt'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
                      }`}
                    >
                      Manager / Admin / Supervisor
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userRoleCategory === 'mgmt' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-800'}`}>
                        {countMgmt}
                      </span>
                    </button>

                    <button
                      onClick={() => setUserRoleCategory('dayshift')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        userRoleCategory === 'dayshift'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'
                      }`}
                    >
                      Dayshift PIC
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userRoleCategory === 'dayshift' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-800'}`}>
                        {countDay}
                      </span>
                    </button>

                    <button
                      onClick={() => setUserRoleCategory('nightshift')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        userRoleCategory === 'nightshift'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'
                      }`}
                    >
                      Nightshift PIC
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userRoleCategory === 'nightshift' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'}`}>
                        {countNight}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {sortedFilteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm font-bold text-slate-500">No staff found matching this filter</p>
                  <button 
                    onClick={() => { setUserRoleCategory('all'); setUserSearchQuery(''); }}
                    className="mt-2 text-xs font-bold text-purple-600 hover:underline cursor-pointer"
                  >
                    Reset Filter & Search
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {sortedFilteredUsers.map((user, idx) => {
                    const isDragging = draggedUserId === user.id;
                    const isDragOver = dragOverUserId === user.id && !isDragging;

                    return (
                      <div 
                        key={user.id} 
                        draggable={editingUserId !== user.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', user.id);
                          setDraggedUserId(user.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverUserId !== user.id) setDragOverUserId(user.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverUserId === user.id) setDragOverUserId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnUser(user.id, sortedFilteredUsers);
                        }}
                        onDragEnd={() => {
                          setDraggedUserId(null);
                          setDragOverUserId(null);
                        }}
                        className={`p-4 border rounded-xl transition-all relative ${
                          isDragging
                            ? 'opacity-40 border-dashed border-purple-400 bg-purple-50/40 scale-[0.99]'
                            : isDragOver
                            ? 'border-purple-500 ring-2 ring-purple-400/50 bg-purple-50/20'
                            : 'border-slate-200 bg-slate-50/50 hover:border-purple-200 hover:bg-white shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        {editingUserId === user.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                              <input className="w-full p-2 border rounded bg-white text-sm" value={editUserData.name || ''} onChange={e => setEditUserData({...editUserData, name: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Employee ID</label>
                              <input className="w-full p-2 border rounded bg-white text-sm" value={editUserData.employeeId || ''} onChange={e => setEditUserData({...editUserData, employeeId: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Username (Login)</label>
                              <input className="w-full p-2 border rounded bg-white text-sm" value={editUserData.username || ''} onChange={e => setEditUserData({...editUserData, username: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                              <input className="w-full p-2 border rounded bg-white text-sm" value={editUserData.password || ''} onChange={e => setEditUserData({...editUserData, password: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Role</label>
                              <select className="w-full p-2 border rounded bg-white text-sm" value={editUserData.role} onChange={e => setEditUserData({...editUserData, role: e.target.value as UserRole})}>
                                <option value="cleaner">PIC (Cleaner)</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="manager">Manager</option>
                                <option value="administrator">Administrator</option>
                                <option value="it">IT Master</option>
                              </select>
                            </div>
                            {editUserData.role === 'cleaner' && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Shift</label>
                                <select className="w-full p-2 border rounded bg-white text-sm" value={editUserData.assignedShift || 'day'} onChange={e => setEditUserData({...editUserData, assignedShift: e.target.value as any})}>
                                  <option value="day">Day Shift</option>
                                  <option value="night">Night Shift</option>
                                </select>
                              </div>
                            )}
                            <div className="col-span-full">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                  <span>Fixed Assigned Operational Areas (Work Scope)</span>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    {(editUserData.assignedZones || []).length} Selected
                                  </span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allZoneNames = zones.map(z => z.name);
                                      setEditUserData({ ...editUserData, assignedZones: allZoneNames });
                                    }}
                                    className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                                  >
                                    Select All
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditUserData({ ...editUserData, assignedZones: [] });
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                                  >
                                    Clear All
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 mb-2">
                                Check the fixed operational areas this employee is responsible for. In their PIC duty timetable, delivery buttons will be automatically pinned for all checked areas without manager manual assignment.
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50/50 max-h-56 overflow-y-auto">
                                {zones.map((z) => {
                                  const isChecked = (editUserData.assignedZones || []).includes(z.name);
                                  return (
                                    <label
                                      key={z.id}
                                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                        isChecked
                                          ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const current = editUserData.assignedZones || [];
                                          if (e.target.checked) {
                                            setEditUserData({
                                              ...editUserData,
                                              assignedZones: [...current, z.name],
                                            });
                                          } else {
                                            setEditUserData({
                                              ...editUserData,
                                              assignedZones: current.filter((zn) => zn !== z.name),
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-400 cursor-pointer shrink-0"
                                      />
                                      <span className="truncate">{z.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            
                            <div className="col-span-full flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
                              <button onClick={saveEditUser} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-lg flex items-center gap-1 hover:bg-emerald-600 cursor-pointer"><CheckCircle2 className="w-4 h-4"/> Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                            {/* Reordering Controls & User Info */}
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex flex-col items-center justify-center gap-0.5 shrink-0 select-none bg-white border border-slate-200 rounded-lg p-1 text-slate-500 shadow-2xs"
                              >
                                {/* Move Up Button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleMoveUserUp(idx, sortedFilteredUsers, e)}
                                  disabled={idx === 0}
                                  title="Move user up"
                                  className={`p-1 rounded transition-colors ${
                                    idx === 0
                                      ? 'text-slate-300 cursor-not-allowed opacity-40'
                                      : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 active:scale-90 cursor-pointer'
                                  }`}
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Sequence Index & Drag Handle */}
                                <div
                                  title="Drag to reorder"
                                  className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing px-1 py-0.5 rounded hover:bg-purple-50 transition-colors"
                                >
                                  <GripVertical className="w-3 h-3 text-slate-400 hover:text-purple-600" />
                                  <span className="text-[10px] font-black text-slate-700 font-mono">#{idx + 1}</span>
                                </div>

                                {/* Move Down Button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleMoveUserDown(idx, sortedFilteredUsers, e)}
                                  disabled={idx === sortedFilteredUsers.length - 1}
                                  title="Move user down"
                                  className={`p-1 rounded transition-colors ${
                                    idx === sortedFilteredUsers.length - 1
                                      ? 'text-slate-300 cursor-not-allowed opacity-40'
                                      : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 active:scale-90 cursor-pointer'
                                  }`}
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* User Info */}
                              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0 mt-0.5 sm:mt-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                                  <span className="break-words">{user.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-extrabold shrink-0 ${
                                    user.role === 'it' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'manager' || user.role === 'administrator' ? 'bg-indigo-100 text-indigo-700' :
                                    user.role === 'supervisor' ? 'bg-cyan-100 text-cyan-700' :
                                    user.assignedShift === 'night' ? 'bg-blue-100 text-blue-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {user.role} {user.role === 'cleaner' ? `(${user.assignedShift || 'day'})` : ''}
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                  <span>ID: <span className="font-mono text-slate-700">{user.employeeId}</span></span>
                                  <span>•</span>
                                  <span>Login: <span className="font-mono text-slate-700">{user.username}</span></span>
                                </div>
                                
                                {/* Assigned Areas Badge Tags */}
                                {(() => {
                                  const userAssignedZones = user.assignedZones && user.assignedZones.length > 0
                                    ? user.assignedZones
                                    : (user.assignedZone ? user.assignedZone.split(', ') : []);
                                  
                                  if (userAssignedZones.length === 0) return null;

                                  return (
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fixed Areas:</span>
                                      {userAssignedZones.map((zn, zIdx) => (
                                        <span
                                          key={zIdx}
                                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/70"
                                        >
                                          {zn}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Actions (Edit / Delete) */}
                            {deletingUserId === user.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 pl-11 sm:pl-0">
                                <span className="text-xs font-bold text-rose-600">Delete user?</span>
                                <button 
                                  onClick={() => { onDeleteUser(user.id); setDeletingUserId(null); }} 
                                  className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded hover:bg-rose-700 shadow-xs cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button 
                                  onClick={() => setDeletingUserId(null)} 
                                  className="px-2.5 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 pl-11 sm:pl-0">
                                <button onClick={() => startEditUser(user)} className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 cursor-pointer">Edit</button>
                                {user.id !== currentUser.id && (
                                  <button onClick={() => setDeletingUserId(user.id)} className="px-3 py-1 text-xs font-bold bg-rose-50 text-rose-600 rounded hover:bg-rose-100 cursor-pointer">Delete</button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'zones' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Operational Areas & Zones</h3>
              </div>
              <button 
                onClick={() => {
                  onAddZone({ id: `zone-${Date.now()}`, name: 'New Zone', orderIndex: zones.length });
                }}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Add Zone
              </button>
            </div>

            <div className="grid gap-3">
              {zones.map((zone, idx) => {
                const isDragging = draggedZoneId === zone.id;
                const isDragOver = dragOverZoneId === zone.id && !isDragging;

                return (
                  <div 
                    key={zone.id} 
                    draggable={editingZoneId !== zone.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', zone.id);
                      setDraggedZoneId(zone.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverZoneId !== zone.id) setDragOverZoneId(zone.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverZoneId === zone.id) setDragOverZoneId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnZone(zone.id);
                    }}
                    onDragEnd={() => {
                      setDraggedZoneId(null);
                      setDragOverZoneId(null);
                    }}
                    className={`p-4 border rounded-xl transition-all ${
                      isDragging
                        ? 'opacity-40 border-dashed border-purple-400 bg-purple-50/40'
                        : isDragOver
                        ? 'border-purple-500 ring-2 ring-purple-400/50 bg-purple-50/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-purple-200 hover:bg-white shadow-2xs'
                    }`}
                  >
                    {editingZoneId === zone.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Zone Name</label>
                          <input className="w-full p-2 border rounded bg-white text-sm font-bold" value={editZoneData.name || ''} onChange={e => setEditZoneData({...editZoneData, name: e.target.value})} />
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Default Standard Tasks / Work Content</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-lg bg-white max-h-48 overflow-y-auto">
                            {tools.map(tool => (
                              <label key={tool.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50 p-1 rounded">
                                <input 
                                  type="checkbox" 
                                  checked={editZoneData.requiredTools?.includes(tool.id) || false}
                                  onChange={(e) => {
                                    const cur = editZoneData.requiredTools || [];
                                    if (e.target.checked) setEditZoneData({...editZoneData, requiredTools: [...cur, tool.id]});
                                    else setEditZoneData({...editZoneData, requiredTools: cur.filter(id => id !== tool.id)});
                                  }}
                                  className="w-4 h-4 text-purple-600 rounded"
                                />
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {tool.imageUrl && <img src={tool.imageUrl} alt="" className="w-5 h-5 object-cover rounded shrink-0" />}
                                  <span className="truncate">{tool.name}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Default Area Standard Instructions</label>
                          <textarea 
                            className="w-full p-2 border rounded bg-white text-sm" 
                            rows={3}
                            placeholder="e.g. Empty trash bins, sweep floors, disinfect tables..."
                            value={editZoneData.defaultTasks || ''} 
                            onChange={e => setEditZoneData({...editZoneData, defaultTasks: e.target.value})} 
                          />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingZoneId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
                          <button onClick={saveEditZone} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-4 h-4"/> Save Zone</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Reorder Buttons */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex flex-col items-center justify-center gap-0.5 shrink-0 select-none bg-white border border-slate-200 rounded-lg p-1 text-slate-500 shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleMoveZoneUp(idx, e)}
                              disabled={idx === 0}
                              title="Move zone up"
                              className={`p-1 rounded transition-colors ${
                                idx === 0
                                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                                  : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 active:scale-90 cursor-pointer'
                              }`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing px-1 py-0.5 rounded hover:bg-purple-50">
                              <GripVertical className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-black text-slate-700 font-mono">#{idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleMoveZoneDown(idx, e)}
                              disabled={idx === zones.length - 1}
                              title="Move zone down"
                              className={`p-1 rounded transition-colors ${
                                idx === zones.length - 1
                                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                                  : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 active:scale-90 cursor-pointer'
                              }`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-sm sm:text-base break-words">{zone.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>Work Items: <span className="font-semibold text-slate-700">{zone.requiredTools?.length || 0}</span></span>
                              <span>•</span>
                              <span>Instructions: <span className="font-semibold text-slate-700">{zone.defaultTasks ? 'Configured' : 'None'}</span></span>
                            </div>
                          </div>
                        </div>

                        {deletingZoneId === zone.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 pl-11 sm:pl-0">
                            <span className="text-xs font-bold text-rose-600">Delete zone?</span>
                            <button 
                              onClick={() => { onDeleteZone(zone.id); setDeletingZoneId(null); }} 
                              className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded hover:bg-rose-700 shadow-xs cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setDeletingZoneId(null)} 
                              className="px-2.5 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 pl-11 sm:pl-0">
                            <button onClick={() => startEditZone(zone)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer">Edit</button>
                            <button onClick={() => setDeletingZoneId(zone.id)} className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 cursor-pointer">Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Cleaning Task & Work Content Library</h3>
              </div>
              <button 
                onClick={() => {
                  onAddTool({ id: `tool-${Date.now()}`, name: 'New Work Task', isChecked: false, category: 'equipment', imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400', description: '', orderIndex: tools.length });
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Add Task Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool, idx) => {
                const isDragging = draggedToolId === tool.id;
                const isDragOver = dragOverToolId === tool.id && !isDragging;

                return (
                  <div 
                    key={tool.id} 
                    draggable={editingToolId !== tool.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', tool.id);
                      setDraggedToolId(tool.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverToolId !== tool.id) setDragOverToolId(tool.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverToolId === tool.id) setDragOverToolId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnTool(tool.id);
                    }}
                    onDragEnd={() => {
                      setDraggedToolId(null);
                      setDragOverToolId(null);
                    }}
                    className={`p-4 border rounded-2xl bg-white shadow-xs flex flex-col gap-3 group transition-all ${
                      isDragging
                        ? 'opacity-40 border-dashed border-purple-400 bg-purple-50/30'
                        : isDragOver
                        ? 'border-purple-500 ring-2 ring-purple-400/50 bg-purple-50/20'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    {editingToolId === tool.id ? (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div 
                            className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer shrink-0 relative hover:border-purple-400 hover:bg-purple-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {isCompressingToolPhoto ? (
                              <div className="flex flex-col items-center justify-center text-purple-600 gap-1">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[9px] font-bold text-slate-500">Optimizing...</span>
                              </div>
                            ) : editToolData.imageUrl ? (
                              <img src={editToolData.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                                <Camera className="w-6 h-6 mb-1 text-purple-600" />
                                <span className="text-[9px] font-bold uppercase text-slate-600">Upload Demo Photo</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                          </div>
                          <div className="flex-1 space-y-2 flex flex-col justify-center">
                            <label className="text-xs font-bold text-slate-700">Task Name</label>
                            <input 
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-sm font-bold placeholder:font-normal" 
                              placeholder="Task Name (e.g. Sweeping)" 
                              value={editToolData.name || ''} 
                              onChange={e => setEditToolData({...editToolData, name: e.target.value})} 
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button onClick={() => setEditingToolId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
                          <button onClick={saveEditTool} className="px-4 py-1.5 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-xs cursor-pointer">Save Task Item</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          {/* Reordering Controls */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex flex-col items-center justify-center gap-0.5 shrink-0 select-none bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-500 shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleMoveToolUp(idx, e)}
                              disabled={idx === 0}
                              title="Move tool up"
                              className={`p-1 rounded transition-colors ${
                                idx === 0
                                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                                  : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 active:scale-90 cursor-pointer'
                              }`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing px-1 py-0.5 rounded hover:bg-purple-50">
                              <GripVertical className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-black text-slate-700 font-mono">#{idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleMoveToolDown(idx, e)}
                              disabled={idx === tools.length - 1}
                              title="Move tool down"
                              className={`p-1 rounded transition-colors ${
                                idx === tools.length - 1
                                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                                  : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 active:scale-90 cursor-pointer'
                              }`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden relative shadow-xs">
                            {tool.imageUrl ? (
                              <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" />
                            ) : (
                              <ClipboardList className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm leading-snug truncate">{tool.name}</h4>
                          </div>
                        </div>

                        {deletingToolId === tool.id ? (
                          <div className="flex items-center gap-1.5 justify-end mt-auto pt-3 border-t border-slate-50 animate-in fade-in">
                            <span className="text-xs font-bold text-rose-600">Delete work task?</span>
                            <button 
                              onClick={() => { onDeleteTool(tool.id); setDeletingToolId(null); }} 
                              className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setDeletingToolId(null)} 
                              className="px-2.5 py-1 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end mt-auto pt-3 border-t border-slate-50">
                            <button onClick={() => startEditTool(tool)} className="px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer">Edit Task</button>
                            <button onClick={() => setDeletingToolId(tool.id)} className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer">Delete</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
