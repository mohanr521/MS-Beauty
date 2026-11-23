import { auth } from '../firebase.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatUserFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const raw = error.message.trim();
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
      const detail = typeof parsed.error === 'string' ? parsed.error : '';
      if (detail.includes('Quota exceeded')) {
        return 'Studio database daily quota was exceeded. Please try again tomorrow.';
      }
      if (detail.includes('Missing or insufficient permissions')) {
        return 'Your account does not have permission for this action. Please sign in with a verified Google account and try again.';
      }
      if (detail) {
        return detail;
      }
    } catch {
      // Fall through to raw message handling
    }
  }

  if (raw.includes('auth/popup-blocked')) {
    return 'Sign-in pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
  }
  if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
    return 'Google sign-in was cancelled before completing.';
  }
  if (raw.includes('auth/unauthorized-domain')) {
    return 'This preview domain is not authorized for Google Sign-In. Open the hosted preview URL or authorize this domain in Firebase Auth.';
  }
  if (raw.includes('Quota exceeded')) {
    return 'Studio database daily quota was exceeded. Please try again tomorrow.';
  }

  return raw || fallback;
}
