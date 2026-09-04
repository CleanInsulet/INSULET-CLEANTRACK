import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { readFileSync } from 'fs';

const fbConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const auth = getAuth(app);

try {
  await createUserWithEmailAndPassword(auth, "demo@cleantrack.local", "password123");
  console.log("SUCCESS create");
} catch (e) {
  console.error("FAIL create", e.code, e.message);
  if (e.code === 'auth/email-already-in-use') {
    try {
      await signInWithEmailAndPassword(auth, "demo@cleantrack.local", "password123");
      console.log("SUCCESS login");
    } catch (e2) {
      console.error("FAIL login", e2.code, e2.message);
    }
  }
}
