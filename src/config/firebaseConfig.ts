/**
 * Configuração do Firebase e Google OAuth para o VidaOrganizada.
 *
 * Em repositórios públicos, nenhuma chave secreta ou credencial é hardcoded aqui.
 * Os valores são lidos exclusivamente das variáveis de ambiente Vite (VITE_FIREBASE_*)
 * ou fornecidos em tempo de execução/build.
 */

export const firebaseConfig = {
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'gen-lang-client-0273340873',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:388813631254:web:adadb92fbbfa0a86eaaa37',
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'gen-lang-client-0273340873.firebaseapp.com',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'gen-lang-client-0273340873.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '388813631254',
  measurementId: '',
  oAuthClientId: (import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID as string) || '388813631254-0vgb6rc2uhvbjo5cjkscae25a0ro4jji.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

export default firebaseConfig;
