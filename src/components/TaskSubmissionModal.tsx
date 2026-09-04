import React, { useState, useRef, useEffect } from 'react';
import { CleaningTask, ToolItem, MediaProof } from '../types';
import { formatTime } from '../utils/storage';
import { compressImage, compressUltraSmallImage } from '../utils/imageCompressor';
import { Camera, Video, CheckSquare, Trash2, Send, X, CheckCircle2, MapPin, Clock, FileText, Play, AlertCircle, RefreshCw, Smartphone, Loader2, ImagePlus, ZoomIn, Download } from 'lucide-react';

interface TaskSubmissionModalProps {
  task: CleaningTask;
  isOpen: boolean;
  onClose: () => void;
  onSubmitWork: (
    taskId: string,
    updatedTools: ToolItem[],
    proofs: MediaProof[],
    cleanerNotes: string
  ) => void;
}

export const TaskSubmissionModal: React.FC<TaskSubmissionModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmitWork,
}) => {
  const [tools, setTools] = useState<ToolItem[]>(task?.toolsRequired || []);
  const [proofs, setProofs] = useState<MediaProof[]>(task?.proofsSubmitted || []);
  const [cleanerNotes, setCleanerNotes] = useState(task?.cleanerNotes || '');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageCaption, setPreviewImageCaption] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (task) {
      setTools(task.toolsRequired || []);
      setProofs(task.proofsSubmitted || []);
      setCleanerNotes(task.cleanerNotes || '');
    }
  }, [task]);

  // Stop camera when unmounting or modal closes
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  if (!isOpen || !task) return null;

  const handleToggleTool = (toolId: string) => {
    setTools(
      (tools || []).map((t) => (t.id === toolId ? { ...t, isChecked: !t.isChecked } : t))
    );
  };

  const handleSelectAllTools = () => {
    const allChecked = (tools || []).every((t) => t.isChecked);
    setTools((tools || []).map((t) => ({ ...t, isChecked: !allChecked })));
  };

  // Per-Task On-Site Live Camera Photo Proof Capture (ultra-small compressed)
  const handleTaskPhotoProof = async (toolId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingMedia(true);
    try {
      const compressedProof = await compressUltraSmallImage(file);
      const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentTaskObj = tools.find(t => t.id === toolId);
      const taskName = currentTaskObj ? currentTaskObj.name : 'Work Content';

      setTools(prev => prev.map(t => {
        if (t.id === toolId) {
          return {
            ...t,
            isChecked: true,
            proofImage: compressedProof,
            proofTimestamp: timestampStr
          };
        }
        return t;
      }));

      const newProof: MediaProof = {
        id: `proof-item-${toolId}-${Date.now()}`,
        type: 'image',
        url: compressedProof,
        timestamp: timestampStr,
        caption: `Live Task Proof: ${taskName}`,
      };
      setProofs(prev => [...prev, newProof]);
    } catch (err) {
      console.error('Per-task photo proof capture error:', err);
      alert('Error capturing task proof photo. Please try again.');
    } finally {
      setIsProcessingMedia(false);
      e.target.value = '';
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Camera Live Capture Trigger - Defaults to Rear Camera (environment) on Mobile Phones
  const startCamera = async (mode?: 'environment' | 'user') => {
    const targetMode = mode || facingMode;
    try {
      setIsCameraActive(true);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream;
      try {
        // Request rear (back) camera on phones first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch {
        // Fallback if specific constraint fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error', err);
      alert('Could not access live camera. Please use the album upload option.');
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      setIsProcessingMedia(true);
      try {
        const compressedDataUrl = await compressImage(rawDataUrl, 640, 640, 0.55);
        const newProof: MediaProof = {
          id: `proof-cam-${Date.now()}`,
          type: 'image',
          url: compressedDataUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          caption: 'Rear Camera Photo of Cleaned Area',
        };
        setProofs((prev) => [...prev, newProof]);
      } catch (e) {
        console.error('Camera photo compression error:', e);
      } finally {
        setIsProcessingMedia(false);
        stopCameraStream();
      }
    }
  };

  const handleDeleteProof = (id: string) => {
    setProofs(proofs.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (proofs.length === 0) {
      alert('Please attach at least one photo or video proof of the cleaned area before submitting.');
      return;
    }
    stopCameraStream();
    onSubmitWork(task.id, tools, proofs, cleanerNotes);
    onClose();
  };

  const allToolsChecked = tools.length > 0 && tools.every((t) => t.isChecked);
  const checkedCount = tools.filter((t) => t.isChecked).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        
        {/* Modal Header - Stays fixed at top */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Work Submission
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
                {task.submittedAt ? `Delivered: ${task.submittedAt}` : `Delivery: ${task.endTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body - Smooth vertical scrolling on mobile regardless of photo count */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0 space-y-5 pt-4 pr-1">
          
          {/* Supervisor Rejection / Rework Callout Banner */}
          {(task.status === 'rework_requested' || task.inspectionLog?.action === 'rework_requested') && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" /> Supervisor Rejection & Rework Request
                </span>
                <span className="bg-red-200 text-red-900 text-xs px-2.5 py-0.5 rounded font-bold">
                  ⭐ {task.inspectionLog?.rating || 1}.0 Rating
                </span>
              </div>
              <p className="text-xs text-red-800 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-red-200/80">
                <span className="font-bold block text-red-900 mb-0.5">Supervisor Command / Notes ({task.inspectionLog?.supervisorName || 'Supervisor'}):</span>
                "{task.inspectionLog?.feedback || 'Please fix and re-verify cleaned zone.'}"
              </p>
              <p className="text-[11px] text-red-600 font-semibold">
                ⚠️ Please update your equipment checklist, capture new photo proof addressing the notes, and click "Submit Duty for Verification".
              </p>
            </div>
          )}
          
          {/* Standard Work Content & Per-Task Photo Proof Checklist */}
          <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Assigned Work Content & Tasks
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Check tasks done and snap live on-site proof photos for each item.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAllTools}
                className="text-xs text-purple-600 font-bold hover:underline cursor-pointer shrink-0"
              >
                {allToolsChecked ? 'Uncheck All' : 'Select All Completed'}
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    tool.isChecked
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Top / Left Group: Checkbox + Demo Image + Task Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Completion Checkbox */}
                      <input
                        type="checkbox"
                        checked={tool.isChecked}
                        onChange={() => handleToggleTool(tool.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300 mt-1 cursor-pointer shrink-0"
                      />

                      {/* Task Demo Image */}
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative group">
                        {tool.imageUrl ? (
                          <img
                            src={tool.imageUrl}
                            alt={tool.name}
                            onClick={() => {
                              setPreviewImageUrl(tool.imageUrl || null);
                              setPreviewImageCaption(`Standard Tool / Equipment: ${tool.name}`);
                            }}
                            className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform"
                            title="Click to enlarge"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400 font-bold">TASK</div>
                        )}
                      </div>

                      {/* Task Info & Guidance */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 text-sm leading-snug">{tool.name}</span>
                          {tool.isChecked && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                        {tool.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tool.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Bottom / Right Group: Proof Actions & Display */}
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-1 sm:mt-0 pl-7 sm:pl-0">
                      
                      {/* Per-Task Live Camera Proof Button */}
                      <div className="w-full sm:w-auto flex flex-col items-start sm:items-end">
                        <label 
                          className={`w-full sm:w-auto justify-center px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                            tool.proofImage 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                              : 'bg-purple-600 border-purple-700 text-white hover:bg-purple-700'
                          }`}
                          title="Take live photo proof on site"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{tool.proofImage ? 'Retake Photo' : 'Take Proof Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleTaskPhotoProof(tool.id, e)}
                            className="hidden"
                            disabled={isProcessingMedia}
                          />
                        </label>
                        <span className="text-[9px] text-slate-400 mt-0.5 ml-1 sm:ml-0">Ultra Small (~8KB)</span>
                      </div>

                      {/* On-Site Proof Photo display if captured */}
                      {tool.proofImage && (
                        <div
                          onClick={() => {
                            setPreviewImageUrl(tool.proofImage || null);
                            setPreviewImageCaption(`Live Proof: "${tool.name}" • ${tool.proofTimestamp || 'Captured'}`);
                          }}
                          className="w-full sm:w-auto flex items-center gap-2 p-1.5 bg-white border border-emerald-200 rounded-lg animate-in fade-in cursor-zoom-in hover:border-emerald-400 hover:shadow-xs transition-all group"
                          title="Click to view enlarged proof"
                        >
                          <img src={tool.proofImage} alt="Task proof" className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded border border-emerald-300 shrink-0 group-hover:scale-105 transition-transform" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Photo Captured 🔍
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">{tool.proofTimestamp || 'Just now'}</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Completed Work Items:</span>
              <span className={checkedCount > 0 ? 'text-purple-700 font-bold' : 'text-amber-600 font-bold'}>
                {checkedCount} / {tools.length} Tasks Verified
              </span>
            </div>
          </div>

          {/* Photo or Video Proof Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Upload Photo
                </h3>
              </div>
            </div>

            {/* Media Upload Action Buttons */}
            <div className="grid grid-cols-1 gap-3 mb-3.5">
              {/* Live Web Camera View with Switch/Flip Support */}
              <button
                type="button"
                onClick={() => startCamera('environment')}
                disabled={isProcessingMedia}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1 text-indigo-700 shadow-2xs disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold">Live Camera Preview</span>
                </div>
                <span className="text-[10px] text-indigo-500">View live feed with rear/front lens</span>
              </button>
            </div>

            {/* Media processing spinner banner */}
            {isProcessingMedia && (
              <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-blue-800 animate-pulse">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Optimizing photo for instant cloud delivery...</span>
              </div>
            )}

            {/* Live Camera View Overlay if active */}
            {isCameraActive && (
              <div className="mb-4 bg-slate-900 rounded-2xl p-3 text-white relative shadow-xl border border-slate-800">
                <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-56 object-cover rounded-xl" autoPlay playsInline muted />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>Lens: {facingMode === 'environment' ? 'Rear (Back)' : 'Front'}</span>
                  </div>
                </div>
                
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="mt-3 flex flex-wrap justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleCameraFacingMode}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    title="Flip camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> Switch Front/Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={captureCameraPhoto}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/40 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Capture Photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Attached Proof Gallery */}
            {proofs.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Attached Media Proof ({proofs.length}):</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                  {proofs.map((proof) => (
                    <div key={proof.id} className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-2xs">
                      {proof.type === 'video' ? (
                        <div className="h-24 bg-slate-800 flex items-center justify-center text-white relative">
                          <video src={proof.url} className="w-full h-full object-cover" controls />
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setPreviewImageUrl(proof.url);
                            setPreviewImageCaption(proof.caption ? `${proof.caption} • ${proof.timestamp}` : `Attached Proof • ${proof.timestamp}`);
                          }}
                          className="cursor-zoom-in relative overflow-hidden"
                          title="Click to enlarge"
                        >
                          <img src={proof.url} alt="Proof" className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                              <ZoomIn className="w-2.5 h-2.5" /> Enlarge
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-1.5 bg-white text-[10px]">
                        <div className="font-bold text-slate-800 truncate">{proof.caption || 'Cleaned Proof'}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">{proof.timestamp}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteProof(proof.id)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-xs cursor-pointer z-10"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                No proof media attached yet. Tap <strong className="text-emerald-700">"Live Camera Preview"</strong> to capture a photo.
              </div>
            )}

          </div>

          {/* Cleaner Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cleaner Comments / Special Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Applied extra floor descaler on corner tiles. Restroom dispensers refilled."
              value={cleanerNotes}
              onChange={(e) => setCleanerNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            ></textarea>
          </div>

          {/* Modal Footer - Fixed at bottom */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-shrink-0 mt-auto bg-white">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" /> Submit Duty for Supervisor Approval
            </button>
          </div>

        </form>

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

