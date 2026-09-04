import re

with open('src/components/LoginPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("await signInAnonymously(auth);", "// await signInAnonymously(auth);")

with open('src/components/LoginPage.tsx', 'w') as f:
    f.write(content)
