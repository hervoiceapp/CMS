"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { Trash2, Upload, UserCheck, Loader2, User } from "lucide-react";

// Strict interface reflecting your 'doctors' collection data structure
interface DoctorItem {
  id: string; // Document ID
  doctorName: string;
  doctorTitle: string;
  doctorImage: string; // Holds 'gs://' storage path configuration string
}

export default function PhysiciansRegistry() {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  // Form states matching text field inputs
  const [doctorName, setDoctorName] = useState("");
  const [doctorTitle, setDoctorTitle] = useState("Psychiatric Nurse"); // Default baseline choice

  // Profile upload image handling states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert Firebase Storage gs:// paths to public HTTP URLs
  const formatImageUrl = (gsUrl: string) => {
    if (!gsUrl || !gsUrl.startsWith("gs://")) return "";
    const path = gsUrl.replace("gs://", "");
    const firstSlash = path.indexOf("/");
    const bucket = path.substring(0, firstSlash);
    const filePath = encodeURIComponent(path.substring(firstSlash + 1));
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;
  };

  // 1. Listen live to your actual Firestore 'doctors' collection
  useEffect(() => {
    const doctorsQuery = query(collection(db, "doctors"));

    const unsubscribe = onSnapshot(
      doctorsQuery,
      (snapshot) => {
        const liveDoctors: DoctorItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          liveDoctors.push({
            id: doc.id,
            doctorName: data.doctorName || "Unknown Specialist",
            doctorTitle: data.doctorTitle || "Medical Professional",
            doctorImage: data.doctorImage || data.image || "",
          });
        });
        setDoctors(liveDoctors);
        setLoading(false);
      },
      (error) => {
        console.error("Doctors registry fetch error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Handle local image file changes prior to submit block operations
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 2. Submit a new medical provider doc onto the global storage and database clusters
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !doctorTitle) {
      return alert("Please provide both the Name and Professional Title.");
    }

    try {
      setUploading(true);
      let targetGsUrl = ""; // Defaults empty if no explicit picture attachment provided

      if (imageFile) {
        // Upload the profile image into your storage ecosystem
        const imageStorageRef = ref(
          storage,
          `her_voice_meta/doctors/${Date.now()}_${imageFile.name}`,
        );
        const uploadTask = await uploadBytesResumable(
          imageStorageRef,
          imageFile,
        );
        targetGsUrl = `gs://${imageStorageRef.bucket}/${uploadTask.ref.fullPath}`;
      }

      const newDoctorPayload = {
        doctorName,
        doctorTitle,
        doctorImage: targetGsUrl,
      };

      await addDoc(collection(db, "doctors"), newDoctorPayload);

      // Clear input controls
      setDoctorName("");
      setDoctorTitle("Psychiatric Nurse");
      setImageFile(null);
      setImagePreview(null);
      setUploading(false);
    } catch (err) {
      console.error("Error registering physician:", err);
      alert("Registration failed.");
      setUploading(false);
    }
  };

  // 3. Remove professional reference records from Firestore instantly
  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this clinician from the live registry?",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "doctors", id));
    } catch (err) {
      console.error(
        "Deletion target failure matching ID reference pool:",
        id,
        err,
      );
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div className="text-xs font-medium text-slate-400">
          Syncing verified clinician registry...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: Registry Creation Module Box Form */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-[15px] mb-6">
          <UserCheck className="w-5 h-5" />
          <h3>Register Verified Clinical Provider</h3>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Full Name & Credential
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Evelyn Harris, MD"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Clinical Specialty Title
              </label>
              <select
                value={doctorTitle}
                onChange={(e) => setDoctorTitle(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-700"
              >
                <option>Psychiatric Nurse</option>
                <option>Obstetrician & Gynecologist</option>
                <option>Clinical Psychologist</option>
                <option>Maternal Health Consultant</option>
              </select>
            </div>
          </div>

          {/* Avatar Upload Drop Zone Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Profile Portrait Image
            </label>
            <div className="flex items-center gap-4 p-4 border border-slate-200 border-dashed rounded-xl bg-slate-50/50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-xs shrink-0"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                Select Photo Asset
              </button>

              {imagePreview ? (
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Clinician preview"
                    className="w-10 h-10 object-cover rounded-full border border-slate-200 shrink-0"
                  />
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {imageFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="text-xs text-rose-500 hover:underline font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  No custom photo chosen. Default badge graphic will apply.
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 bg-[#0070E0] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition shadow-sm"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading
                ? "Registering Specialist..."
                : "Add Provider to Registry"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Active Roster Directory Display List Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">
          Verified Active Directory Pool ({doctors.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex items-center justify-between group transition hover:border-slate-200"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {doctor.doctorImage ? (
                    <img
                      src={formatImageUrl(doctor.doctorImage)}
                      alt={doctor.doctorName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-800 text-sm truncate leading-tight mb-0.5">
                    {doctor.doctorName}
                  </h4>
                  <p className="text-[11px] font-semibold text-blue-600 truncate bg-blue-50/50 border border-blue-100/30 px-2 py-0.5 rounded w-max">
                    {doctor.doctorTitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDelete(doctor.id)}
                className="text-slate-300 hover:text-rose-600 p-2 rounded-md hover:bg-rose-50 transition shrink-0 ml-2"
                title="Deregister Provider"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {doctors.length === 0 && (
          <div className="text-center p-8 border border-dashed border-slate-200 text-slate-400 text-sm rounded-xl bg-slate-50/50">
            No doctors or clinical providers currently registered in this
            database.
          </div>
        )}
      </div>
    </div>
  );
}
