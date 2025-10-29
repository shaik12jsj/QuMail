"use client";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";

export default function TestFirebase() {
  useEffect(() => {
    console.log("Firebase auth object:", auth);
  }, []);
  return <div>Firebase test — check console</div>;
}
