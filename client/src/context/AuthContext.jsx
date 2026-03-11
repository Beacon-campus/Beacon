import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import apiClient from "../services/apiClient";
import { clearAllPageCache } from "../services/pageCache.service";
import { prefetchSessionPageCaches } from "../services/sessionPrefetch.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const didInitialMongoFetchDelay = useRef(false);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Fetch MongoDB Profile (Static Data)
  const fetchMongoProfile = async (firebaseUser) => {
    if (!firebaseUser || !firebaseUser.uid || typeof firebaseUser.getIdToken !== "function") {
      return null;
    }

    try {
      if (!didInitialMongoFetchDelay.current) {
        didInitialMongoFetchDelay.current = true;
        await wait(200);
      }

      const { data } = await apiClient.get("/me");
      return data;
    } catch (error) {
      console.error("Mongo profile fetch failed:", error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          clearAllPageCache();
          setUser(null);
          setLoading(false);
          return;
        }

        // 1. Fetch Flags & Profile
        const [firestoreSnap, mongoData] = await Promise.all([
          getDoc(doc(db, "users", fbUser.uid)),
          fetchMongoProfile(fbUser)
        ]);

        let firestoreFlags = {};
        if (firestoreSnap.exists()) {
          const d = firestoreSnap.data();

          // LOGIC: Trust Firebase Auth for email verification status
          const isEmailReallyVerified = fbUser.emailVerified || d.isemailverified === true;
          const isPasswordReset = d.ispasswordreset === true;
          const isOnboardingComplete = d.onboardingComplete === true;

          // ✅ NEW FIX: Sync Email if Verified & Pending Matches
          if (d.pendingmail && isEmailReallyVerified && d.pendingmail.toLowerCase() === fbUser.email.toLowerCase()) {
            console.log("✅ Email verification confirmed! Syncing Firestore...");
            await updateDoc(doc(db, "users", fbUser.uid), {
              email: fbUser.email,
              pendingmail: "",
              isemailverified: true
            });

            // Sync MongoDB
          try {
            await wait(200);
            await apiClient.put("/sync-email");
              console.log("✅ MongoDB email sync triggered");
            } catch (err) {
              console.error("❌ MongoDB sync failed:", err);
            }

            // Update local data view
            d.email = fbUser.email;
            d.pendingmail = "";
            d.isemailverified = true;
          }

          firestoreFlags = {
            onboardingComplete: isOnboardingComplete,
            ispasswordreset: isPasswordReset,
            isemailverified: isEmailReallyVerified || d.isemailverified,
            role: d.role || "student",
          };

          // ✅ CRITICAL REQUIREMENT: "Once both updated, set onboarding to true"
          // We check this here so it updates automatically in the background
          if (
            isPasswordReset &&
            (isEmailReallyVerified || d.isemailverified) &&
            !isOnboardingComplete
          ) {
            console.log("🎉 User completed onboarding! Updating DB...");
            await updateDoc(doc(db, "users", fbUser.uid), {
              onboardingComplete: true,
              isemailverified: true, // Ensure this is synced too
            });
            firestoreFlags.onboardingComplete = true; // Update local state immediately
          }
        }

        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified,
          ...mongoData,
          ...firestoreFlags,
        });

        // Warm per-session page caches right after login.
        prefetchSessionPageCaches({
          uid: fbUser.uid,
          role: firestoreFlags.role || mongoData?.role || "student",
        }).catch(() => {});
      } catch (err) {
        console.error("AuthContext error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload(); // Force refresh from Firebase

      const [fsSnap, mData] = await Promise.all([
        getDoc(doc(db, "users", auth.currentUser.uid)),
        fetchMongoProfile(auth.currentUser)
      ]);

      if (fsSnap.exists()) {
        const d = fsSnap.data();
        const isEmailReallyVerified = auth.currentUser.emailVerified || d.isemailverified === true;
        const isPasswordReset = d.ispasswordreset === true;
        const isOnboardingComplete = d.onboardingComplete === true;

        // ✅ NEW FIX: Sync Email if Verified & Pending Matches (Refresh)
        if (d.pendingmail && isEmailReallyVerified && d.pendingmail.toLowerCase() === auth.currentUser.email.toLowerCase()) {
          console.log("✅ Email verification confirmed (Refresh)! Syncing Firestore...");
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            email: auth.currentUser.email,
            pendingmail: "",
            isemailverified: true
          });

          // Sync MongoDB
          try {
            await wait(200);
            await apiClient.put("/sync-email");
            console.log("✅ MongoDB email sync triggered");
          } catch (err) {
            console.error("❌ MongoDB sync failed:", err);
          }
        }

        // Same check on refresh
        if (isPasswordReset && isEmailReallyVerified && !isOnboardingComplete) {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            onboardingComplete: true,
            isemailverified: true
          });
        }

        setUser((prev) => ({
          ...prev,
          ...mData,
          onboardingComplete:
            isPasswordReset && isEmailReallyVerified
              ? true
              : isOnboardingComplete,
          ispasswordreset: isPasswordReset,
          isemailverified: isEmailReallyVerified,
        }));
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

