import cloudbase from "@cloudbase/js-sdk";

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID;

export const isCloudBaseConfigured = Boolean(envId);

export const cloudbaseApp = isCloudBaseConfigured
  ? cloudbase.init({
      env: envId,
    })
  : null;

export const auth = cloudbaseApp?.auth({
  persistence: "local",
});

export const db = cloudbaseApp?.database();

export async function ensureAnonymousSession() {
  if (!auth) return;
  try {
    const loginState = await auth.getLoginState();
    if (loginState) return;
    if (typeof auth.signInAnonymously === "function") {
      await auth.signInAnonymously();
      return;
    }
    if (typeof auth.anonymousAuthProvider === "function") {
      await auth.anonymousAuthProvider().signIn();
    }
  } catch {
    // Public collection rules may allow reads/writes without anonymous auth.
  }
}

export function toDocId(doc) {
  return doc.id || doc._id;
}
