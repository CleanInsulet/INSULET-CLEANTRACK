with open('src/components/SettingsModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
'''  onDeleteUser?: (userId: string) => void;
}''',
'''  onDeleteUser?: (userId: string) => void;
  onResetData?: () => void;
}'''
)

content = content.replace(
'''  onDeleteUser,
}) => {''',
'''  onDeleteUser,
  onResetData,
}) => {'''
)

content = content.replace(
'''          {/* Form Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleReset}''',
'''          {/* Form Action Footer */}
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
              onClick={handleReset}'''
)

content = content.replace(
'''            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>''',
'''            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
            </div>
          </div>'''
)

with open('src/components/SettingsModal.tsx', 'w') as f:
    f.write(content)
