"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { setSession, clearAllAppSession } from "@/src/lib/functions";
import { getConnectUserServer } from "@/src/features/auth/api/auth-server-actions";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any | null;
  refreshUserData: () => Promise<void>; // 追加
}

// 初期値に空の関数を入れておく
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  userData: null,
  refreshUserData: async () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Server Action経由で最新データを取得
  const fetchUserData = async (uid: string) => {
    try {
      const data = await getConnectUserServer(uid);
      if (data) {
        setUserData(data);
        Object.entries(data).forEach(([k, v]) => setSession(k, v));
      }
    } catch (e) {
      console.error("fetchUserData error:", e);
    }
  };

  const refreshUserData = async () => {
    if (user) await fetchUserData(user.uid);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setSession("uid", firebaseUser.uid);
        await fetchUserData(firebaseUser.uid); // 初回読み込み
      } else {
        setUser(null);
        setUserData(null);
        clearAllAppSession();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userData, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);