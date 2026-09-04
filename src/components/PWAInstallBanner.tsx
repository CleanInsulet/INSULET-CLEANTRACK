import React from 'react';
import { Smartphone, Download, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';

interface PWAInstallBannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Install CleanTrack on Phone</h3>
              <p className="text-xs text-slate-500">Fast access for cleaners on shift</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs text-slate-700">
          
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
            <span className="font-bold block text-sm mb-1">📱 Works as a Native Mobile App</span>
            CleanTrack supports PWA installation so cleaners can open shifts directly from their home screen without opening browser tabs!
          </div>

          <div className="space-y-2">
            <div className="font-bold text-slate-900">For iOS (iPhone Safari):</div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
              <li className="flex items-center gap-2">
                <Share className="w-4 h-4 text-blue-600" /> Tap the <strong className="text-slate-800">Share</strong> button in Safari toolbar.
              </li>
              <li className="flex items-center gap-2">
                <PlusSquare className="w-4 h-4 text-emerald-600" /> Scroll down and select <strong className="text-slate-800">"Add to Home Screen"</strong>.
              </li>
              <li>Tap <strong>Add</strong> in top right corner.</li>
            </ol>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="font-bold text-slate-900">For Android (Chrome):</div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
              <li>Tap the <strong>three dots menu (⋮)</strong> in Chrome top right.</li>
              <li>Select <strong className="text-slate-800">"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
              <li>Confirm installation prompt.</li>
            </ol>
          </div>

        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Got It, Thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
