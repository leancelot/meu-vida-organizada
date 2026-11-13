/**
 * Configuração do Firebase e Google OAuth para o VidaOrganizada.
 *
 * Em repositórios públicos, nenhuma chave secreta ou credencial é hardcoded aqui.
 * Os valores são lidos exclusivamente das variáveis de ambiente Vite (VITE_FIREBASE_*)
 * ou fornecidos em tempo de execução/build.
 */

export const firebaseConfig = {
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  measurementId: '',
  oAuthClientId: (import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID as string) || '',
  recaptchaSiteKey: '',
};

export default firebaseConfig;
