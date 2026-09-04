with open('src/components/LoginPage.tsx', 'r') as f:
    lines = f.readlines()
    
# Remove lines 12 and 13 (0-indexed)
del lines[12:14]

lines.insert(20, "import { auth, googleAuthProvider } from '../lib/firebase';\nimport { signInWithPopup } from 'firebase/auth';\n")

with open('src/components/LoginPage.tsx', 'w') as f:
    f.writelines(lines)
