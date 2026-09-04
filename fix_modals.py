import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

# Fix 1: Quick Duty Modal
old_quick = '''        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 font-sans space-y-4">'''
new_quick = '''        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 font-sans space-y-4 max-h-[90vh] overflow-y-auto">'''
content = content.replace(old_quick, new_quick)

# Fix 2: Task Assignment Modal
old_assign = '''        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">'''
new_assign = '''        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto flex flex-col">'''
content = content.replace(old_assign, new_assign)

# Fix 3: Broadcast Modal
old_broadcast = '''        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">'''
new_broadcast = '''        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">'''
content = content.replace(old_broadcast, new_broadcast)

# Fix 4: Also fix Timetable Grid sticky header issue!
old_sticky = '''              {/* Header Hours Row */}
              <div className="grid grid-cols-16 border-b border-slate-200 pb-2 mb-3 bg-slate-50/80 rounded-xl p-2 font-mono text-[11px] font-bold text-slate-500 text-center sticky top-0">'''
new_sticky = '''              {/* Header Hours Row */}
              <div className="grid grid-cols-16 border-b border-slate-200 pb-2 mb-3 bg-slate-50/80 rounded-xl p-2 font-mono text-[11px] font-bold text-slate-500 text-center">'''
# I removed sticky entirely on the timetable header because it doesn't work correctly with overflow-x-auto and causes overlapping with App header on Y axis
content = content.replace(old_sticky, new_sticky)

with open('src/components/ManagerDashboard.tsx', 'w') as f:
    f.write(content)
