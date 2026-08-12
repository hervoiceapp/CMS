"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useCollection<T extends { id: string }>(
  path: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, path), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data() } as T;
        });
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[${path}] snapshot error:`, err);
        setError("Failed to load data. Check your connection and retry.");
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [path, ...constraints]);

  return { data, loading, error };
}
