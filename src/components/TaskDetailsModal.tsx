import React, { useState } from 'react';
import { CleaningTask, UserProfile } from '../types';
import { formatTime } from '../utils/storage';
import { MapPin, Clock, CheckSquare, Camera, X, Star, CheckCircle2, ShieldAlert, User, Check, AlertTriangle, ShieldCheck, ZoomIn, Download } from 'lucide-react';

interface TaskDetailsModalProps {
  task: CleaningTask | null;
  currentUser?: UserProfile;
  onClose: () => void;
  onApproveTask?: (taskId: string, rating: number, feedback: string) => void;
  onRequestRework?: (taskId: string, rating: number, feedback: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  currentUser,
  onClose,
  onApproveTask,
  onRequestRework,
}) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('Great job! Zone cleaned thoroughly.');
  const [isRejecting, setIsRejecting] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageCaption, setPreviewImageCaption] = useState<string | null>(null);

  if (!task) return null;

  const isManagerOrSupervisor = currentUser?.role === 'manager' || currentUser?.role === 'supervisor';
  const isAwaitingApproval = task.status === 'submitted';

  const handleApprove = () => {
    if (onApproveTask) {
      onApproveTask(task.id, rating, feedback);
      onClose();
    }
  };

  const handleRework = () => {
    if (!reworkReason.trim()) {
      alert('Please state what needs to be reworked before sending.');
      return;
    }
    if (onRequestRework) {
      onRequestRework(task.id, 2, reworkReason);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                task.status === 'submitted'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : task.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : task.status === 'rework_requested'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500 font-medium">Zone: {task.zone}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 leading-snug">{task.title}</h2>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-600 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" /> {task.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {task.submittedAt ? `Delivered: ${task.submittedAt}` : `Delivery: ${task.endTime}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-3 text-xs text-slate-700 flex-1 overflow-y-auto pr-1">
          
          {/* Assignee & Supervisor info */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Cleaner</span>
              <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> {task.assignedCleanerName}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Quality Supervisor</span>
              <div className="font-semibold text-slate-900 mt-0.5">
                {task.supervisorName || 'Facilities Supervisor'}
              </div>
            </div>
          </div>

          {/* Instructions */}
          {task.description && (
            <div>
              <span className="font-bold text-slate-800 block mb-1">Duty Description / Notes:</span>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Cleaner's Completion Notes */}
          {task.cleanerNotes && (
            <div>
              <span className="font-bold text-slate-800 block mb-1">Cleaner's Note on Submission:</span>
              <p className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-indigo-950 leading-relaxed">
                "{task.cleanerNotes}"
              </p>
            </div>
          )}

          {/* Tools Required Checklist */}
          <div>
            <span className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1">
              <CheckSquare className="w-4 h-4 text-blue-600" /> Equipment & Tool Audit:
            </span>
            <div className="flex flex-wrap gap-2">
              {(task.toolsRequired || []).map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-medium ${
                    t.isChecked
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {t.imageUrl ? (
                    <img
                      src={t.imageUrl}
                      alt={t.name}
                      onClick={() => {
                        setPreviewImageUrl(t.imageUrl || null);
                        setPreviewImageCaption(`Equipment: ${t.name}`);
                      }}
                      className="w-5 h-5 rounded-md object-cover shrink-0 cursor-zoom-in hover:scale-110 transition-transform shadow-2xs"
                      title="Click to enlarge"
                    />
                  ) : null}
                  <span className="text-xs">{t.isChecked ? '✓' : '—'} {t.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submitted Media Proof */}
          {(task.proofsSubmitted || []).length > 0 && (
            <div>
              <span className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1">
                <Camera className="w-4 h-4 text-indigo-600" /> Cleaned Area Proof Media:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(task.proofsSubmitted || []).map((proof) => (
                  <div
                    key={proof.id}
                    onClick={() => {
                      setPreviewImageUrl(proof.url);
                      setPreviewImageCaption(proof.caption ? `${proof.caption} • ${proof.timestamp}` : `Proof Photo • ${proof.timestamp}`);
                    }}
                    className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group cursor-zoom-in hover:border-indigo-400 hover:shadow-md transition-all"
                  >
                    <img src={proof.url} alt="Proof" className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200" />
                    <div className="p-1.5 text-[10px] text-slate-600 bg-white border-t border-slate-100 truncate flex items-center justify-between">
                      <span className="truncate">{proof.caption || 'Proof photo'} • {proof.timestamp}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-xs shadow-md">
                        <ZoomIn className="w-3 h-3" /> Click to Enlarge
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspection Decision Log if available */}
          {task.inspectionLog && (
            <div
              className={`p-3.5 rounded-xl border space-y-1 ${
                task.status === 'approved' || task.inspectionLog.action === 'approved'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-red-50/80 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {task.status === 'approved' || task.inspectionLog.action === 'approved' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Supervisor Approval Record
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-red-600" /> Supervisor Rejection & Rework
                    </>
                  )}
                </span>
                <span>⭐ {task.inspectionLog.rating || 1}.0 / 5.0</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <span className="font-bold">Supervisor Command / Feedback:</span> "{task.inspectionLog.feedback}"
              </p>
              <div className="text-[10px] opacity-75 mt-0.5">
                Reviewed by {task.inspectionLog.supervisorName} at {task.inspectionLog.timestamp}
              </div>
            </div>
          )}

          {/* Action Form for Manager / Supervisor when task is awaiting verification */}
          {isManagerOrSupervisor && isAwaitingApproval && onApproveTask && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Quality Verification & Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {!isRejecting ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Approval feedback..."
                    className="w-full text-xs px-3 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Approve & Mark Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Request Rework
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 bg-rose-50/90 border border-rose-200 p-3 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-900 block">Rework Reason (will notify cleaner):</span>
                  <textarea
                    rows={2}
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                    placeholder="E.g., North glass streak left uncleaned, please wipe down..."
                    className="w-full text-xs p-2.5 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRework}
                      className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Send Rework Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="py-1.5 px-3 bg-white text-slate-600 border border-slate-200 font-bold text-xs rounded-xl hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </div>

      {/* Fullscreen Image Preview Lightbox / Zoom Modal */}
      {previewImageUrl && (
        <div
          onClick={() => {
            setPreviewImageUrl(null);
            setPreviewImageCaption(null);
          }}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <span className="text-xs sm:text-sm font-semibold truncate text-slate-200">
                {previewImageCaption || 'Image Preview'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageUrl}
                  download="proof-image.jpg"
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
                    setPreviewImageUrl(null);
                    setPreviewImageCaption(null);
                  }}
                  className="text-white hover:text-white bg-rose-600/90 hover:bg-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
            
            <div className="relative max-h-[82vh] overflow-auto flex items-center justify-center rounded-2xl bg-black/50 border border-slate-800 p-1">
              <img
                src={previewImageUrl}
                alt="Enlarged Preview"
                className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

