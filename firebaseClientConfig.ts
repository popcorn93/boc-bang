import firebasePublicConfig from './firebase-applet-config.json';

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId: string;
};

const readEnv = (key: string) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const firebaseClientConfig: FirebaseClientConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN') || firebasePublicConfig.authDomain,
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID') || firebasePublicConfig.projectId,
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET') || firebasePublicConfig.storageBucket,
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebasePublicConfig.messagingSenderId,
  appId: readEnv('VITE_FIREBASE_APP_ID') || firebasePublicConfig.appId,
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID') || firebasePublicConfig.measurementId,
  firestoreDatabaseId: readEnv('VITE_FIREBASE_DATABASE_ID') || firebasePublicConfig.firestoreDatabaseId,
};

if (!firebaseClientConfig.apiKey) {
  throw new Error('Missing VITE_FIREBASE_API_KEY. Add it to the build environment before running the app.');
}

export default firebaseClientConfig;

