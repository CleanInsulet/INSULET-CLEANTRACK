import React, { useState } from 'react';
import { CleaningTask, UserProfile } from '../types';
import { formatTime } from '../utils/storage';
import { ShieldCheck, CheckCircle2, XCircle, Star, Clock, MapPin, CheckSquare, Eye, Camera, MessageSquare, AlertCircle, Sparkles, Filter, Check, ListChecks, ZoomIn, Download, X } from 'lucide-react';

interface SupervisorApprovalProps {
  tasks: CleaningTask[];
  currentUser: UserProfile;
  onApproveTask: (taskId: string, rating: number, feedback: string) => void;
  onRequestRework: (taskId: string, rating: number, feedback: string) => void;
}

export const SupervisorApproval: React.FC<SupervisorApprovalProps> = ({
  tasks,
  currentUser,
  onApproveTask,
  onRequestRework,
}) => {
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('Great job! Zone cleaned thoroughly.');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedProofCaption, setSelectedProofCaption] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<'submitted' | 'active' | 'history' | 'all'>('submitted');

  // Filter tasks
  const pendingApprovalTasks = tasks.filter((t) => t.status === 'submitted');
  const activePendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const verifiedTasks = tasks.filter((t) => t.status === 'approved' || t.status === 'rework_requested');

  const displayedTasks = tasks.filter((t) => {
    if (queueFilter === 'submitted') return t.status === 'submitted';
    if (queueFilter === 'active') return t.status === 'pending' || t.status === 'in_progress';
    if (queueFilter === 'history') return t.status === 'approved' || t.status === 'rework_requested';
    return true;
  });

  const handleOpenReview = (task: CleaningTask) => {
    setSelectedTask(task);
    setRating(task.inspectionLog?.rating || 5);
    setFeedback(task.inspectionLog?.feedback || 'Great job! Zone cleaned thoroughly.');
  };

  const handleConfirmApprove = () => {
    if (!selectedTask) return;
    onApproveTask(selectedTask.id, rating, feedback);
    setSelectedTask(null);
  };

  const handleConfirmRework = () => {
    if (!selectedTask) return;
    if (!feedback.trim()) {
      alert('Please provide specific feedback on what needs rework (e.g. missed corner dust or unemptied bin).');
      return;
    }
    onRequestRework(selectedTask.id, rating, feedback);
    setSelectedTask(null);
  };

  const getStatusPill = (status: CleaningTask['status']) => {
    switch (status) {
      case 'submitted':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">⏳ Awaiting Inspection</span>;
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded text-[10px]">⚡ In Progress</span>;
      case 'pending':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 font-semibold px-2 py-0.5 rounded text-[10px]">📅 Scheduled</span>;
      case 'approved':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">✓ Approved</span>;
      case 'rework_requested':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded text-[10px]">⚠️ Rework</span>;
    }
  };

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Supervisor Queue</h2>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">Quality Verification & Approval Desk</h1>
          <p className="text-slate-500 text-xs mt-1 leading-normal">
            Review cleaner submissions, verify equipment checklists, inspect media proof, and grant supervisor sign-off.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <span className="px-3 py-1.5 bg-amber-50 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            {pendingApprovalTasks.length} Awaiting Approval
          </span>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 shadow-2xs">
            <ListChecks className="w-4 h-4 text-blue-600 shrink-0" />
            {activePendingTasks.length} Active / Scheduled
          </span>
        </div>
      </div>

      {/* Main Review Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tasks Queue */}
        <div className="lg:col-span-1 space-y-3">
          
          {/* Filter Sub-Tabs */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 text-xs font-bold text-slate-600 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setQueueFilter('submitted')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                queueFilter === 'submitted'
                  ? 'bg-white text-amber-900 shadow-xs font-black'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <span>Submissions</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                queueFilter === 'submitted' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {pendingApprovalTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQueueFilter('active')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                queueFilter === 'active'
                  ? 'bg-white text-blue-900 shadow-xs font-black'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <span>Active/Duty</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                queueFilter === 'active' ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {activePendingTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQueueFilter('history')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                queueFilter === 'history'
                  ? 'bg-white text-emerald-900 shadow-xs font-black'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <span>History</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                queueFilter === 'history' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {verifiedTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQueueFilter('all')}
              className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                queueFilter === 'all'
                  ? 'bg-white text-indigo-900 shadow-xs font-black'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
              title="All Duties"
            >
              All ({tasks.length})
            </button>
          </div>

          {/* Task Queue Cards */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 stroke-1" />
                <p className="font-semibold text-sm text-slate-700">No duties found</p>
                <p className="text-xs text-slate-400 mt-0.5">There are no tasks under the "{queueFilter}" tab.</p>
              </div>
            ) : (
              displayedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleOpenReview(task)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTask?.id === task.id
                      ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300/50 shadow-md'
                      : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold mb-1">
                    {getStatusPill(task.status)}
                    <span className="text-[10px] text-slate-500 font-mono font-medium">
                      {task.submittedAt ? `Delivered ${task.submittedAt}` : task.date}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug mt-1.5">{task.title}</h4>
                  
                  <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={task.assignedCleanerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'}
                        alt={task.assignedCleanerName}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="font-medium text-slate-800 text-[11px]">{task.assignedCleanerName}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">📍 {task.location}</span>
                  </div>

                  {task.proofsSubmitted && task.proofsSubmitted.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-indigo-700 font-bold">
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3 text-indigo-500" />
                        {task.proofsSubmitted.length} Proof Photos
                      </span>
                      <span>
                        {task.toolsRequired.filter((t) => t.isChecked).length}/{task.toolsRequired.length} Tools Used
                      </span>
                    </div>
                  )}

                  {task.inspectionLog?.rating && (
                    <div className="mt-1.5 text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <span>⭐ {task.inspectionLog.rating}/5</span>
                      <span className="text-slate-400 truncate">({task.inspectionLog.feedback || 'Approved'})</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

        {/* Right 2 Columns: Selected Task Quality Inspector Panel */}
        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              
              {/* Inspection Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusPill(selectedTask.status)}
                    <span className="text-xs text-slate-500 font-semibold">Zone: {selectedTask.zone}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedTask.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      Cleaner: {selectedTask.assignedCleanerName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      Location: {selectedTask.location}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-700">
                      {selectedTask.submittedAt ? `Delivered: ${selectedTask.submittedAt}` : `Delivery: ${selectedTask.endTime}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    Close Inspection
                  </button>
                </div>
              </div>

              {/* Task Description / Notes */}
              {selectedTask.description && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Task Description / Instructions:</span>
                  <p>{selectedTask.description}</p>
                </div>
              )}

              {/* Tools Checklist Audit */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" /> Equipment & Tools Compliance
                  </h4>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {(selectedTask.toolsRequired || []).filter((t) => t.isChecked).length} / {(selectedTask.toolsRequired || []).length} Verified Used
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(selectedTask.toolsRequired || []).map((tool) => (
                    <span
                      key={tool.id}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 ${
                        tool.isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 opacity-80'
                      }`}
                    >
                      {tool.proofImage ? (
                        <img
                          src={tool.proofImage}
                          alt=""
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProofUrl(tool.proofImage || null);
                            setSelectedProofCaption(`On-Site Live Proof: ${tool.name}`);
                          }}
                          className="w-5 h-5 rounded object-cover cursor-zoom-in hover:scale-110 transition-transform border border-emerald-300 shrink-0"
                          title="Click to view live tool proof"
                        />
                      ) : tool.imageUrl ? (
                        <img
                          src={tool.imageUrl}
                          alt=""
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProofUrl(tool.imageUrl || null);
                            setSelectedProofCaption(`Standard Tool: ${tool.name}`);
                          }}
                          className="w-4 h-4 rounded object-cover cursor-zoom-in hover:scale-110 transition-transform shrink-0"
                          title="Click to view standard tool photo"
                        />
                      ) : null}
                      <span>{tool.isChecked ? '✓' : '○'} {tool.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Photo & Video Proof Lightbox Viewer */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" /> Cleaned Area Media Proof Gallery ({(selectedTask.proofsSubmitted || []).length})
                </h4>
                {(selectedTask.proofsSubmitted || []).length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 border border-slate-200 rounded-xl bg-slate-50">
                    No photo proof submitted yet for this duty.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(selectedTask.proofsSubmitted || []).map((proof) => (
                      <div
                        key={proof.id}
                        onClick={() => {
                          setSelectedProofUrl(proof.url);
                          setSelectedProofCaption(proof.caption ? `${proof.caption} • ${proof.timestamp}` : `Proof Photo • ${proof.timestamp}`);
                        }}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-zoom-in shadow-2xs hover:shadow-md transition-shadow"
                      >
                        <img
                          src={proof.url}
                          alt="Proof"
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 p-2 flex flex-col justify-end text-white text-[10px]">
                          <div className="font-semibold truncate">{proof.caption || 'Cleaned Area'}</div>
                          <div className="text-slate-300 text-[9px]">{proof.timestamp}</div>
                        </div>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-xs">
                            <ZoomIn className="w-3 h-3" /> Click to Enlarge
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cleaner Notes */}
              {selectedTask.cleanerNotes && (
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs text-slate-700">
                  <span className="font-bold text-blue-900 block mb-0.5">Cleaner's Submission Note:</span>
                  "{selectedTask.cleanerNotes}"
                </div>
              )}

              {/* Previous Inspection Log if available */}
              {selectedTask.inspectionLog && (
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-xs text-slate-700">
                  <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                    <span>Supervisor Verified Sign-off:</span>
                    <span>⭐ {selectedTask.inspectionLog.rating}/5.0</span>
                  </div>
                  <p className="text-slate-600">"{selectedTask.inspectionLog.feedback}"</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Verified by {selectedTask.inspectionLog.supervisorName} at {selectedTask.inspectionLog.timestamp}
                  </p>
                </div>
              )}

              {/* Supervisor Decision Form (For Pending, In Progress, Submitted, or Rework duties) */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedTask.status === 'approved' ? 'Update Quality Sign-off' : 'Supervisor Quality Decision & Verification'}
                  </h4>
                  {selectedTask.status === 'pending' || selectedTask.status === 'in_progress' ? (
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      ⚡ On-site / Direct Verification
                    </span>
                  ) : null}
                </div>

                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quality Rating (1 to 5 Stars)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-lg transition-transform cursor-pointer ${
                          rating >= star ? 'text-amber-400 scale-110' : 'text-slate-300'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">{rating}.0 Rating</span>
                  </div>
                </div>

                {/* Feedback notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supervisor Inspection Notes / Feedback</label>
                  <textarea
                    rows={2}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide praise or specify rework instructions..."
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  ></textarea>
                </div>

                {/* Decision Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmRework}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" /> Request Rework
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApprove}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> 
                    {selectedTask.status === 'approved' ? 'Update Sign-off' : 'Approve & Finalize Duty'}
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 h-full flex flex-col items-center justify-center min-h-[300px]">
              <ShieldCheck className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
              <p className="font-semibold text-sm text-slate-700">Select a task from the queue to inspect</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Review equipment compliance, inspect proof photos, and approve or request rework.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Proof Photo Fullscreen Modal */}
      {selectedProofUrl && (
        <div
          onClick={() => {
            setSelectedProofUrl(null);
            setSelectedProofCaption(null);
          }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <span className="text-xs sm:text-sm font-semibold truncate text-slate-200">
                {selectedProofCaption || 'Inspection Proof Preview'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedProofUrl}
                  download="inspection-proof.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-white bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                  title="Open full size / Download"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Original Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProofUrl(null);
                    setSelectedProofCaption(null);
                  }}
                  className="text-white hover:text-white bg-rose-600/90 hover:bg-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
            
            <div className="relative max-h-[82vh] overflow-auto flex items-center justify-center rounded-2xl bg-black/50 border border-slate-800 p-1">
              <img
                src={selectedProofUrl}
                alt="Enlarged Proof"
                className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

