import { deleteObject, ref, uploadBytesResumable, type UploadTaskSnapshot } from "firebase/storage";
import { storage } from "./firebase";

export function gsToHttps(gsUrl: string): string {
  if (!gsUrl || !gsUrl.startsWith("gs://")) return "";
  const path = gsUrl.replace("gs://", "");
  const firstSlash = path.indexOf("/");
  const bucket = path.substring(0, firstSlash);
  const filePath = encodeURIComponent(path.substring(firstSlash + 1));
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;
}

export function uploadFile(
  file: File,
  pathPrefix: string,
  onProgress?: (percent: number) => void,
): Promise<{ gsUrl: string; httpsUrl: string }> {
  const storageRef = ref(storage, `${pathPrefix}/${Date.now()}_${file.name}`);
  const task = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(percent);
      },
      (error) => reject(error),
      () => {
        const gsUrl = `gs://${storageRef.bucket}/${task.snapshot.ref.fullPath}`;
        resolve({ gsUrl, httpsUrl: gsToHttps(gsUrl) });
      },
    );
  });
}

export function deleteFile(gsUrl: string): Promise<void> {
  if (!gsUrl || !gsUrl.startsWith("gs://")) return Promise.resolve();
  const path = gsUrl.replace("gs://", "");
  const slash = path.indexOf("/");
  const filePath = path.substring(slash + 1);
  return deleteObject(ref(storage, filePath));
}

export function formatDuration(value: string | number): string {
  const total = typeof value === "number" ? value : parseInt(value, 10);
  if (isNaN(total) || total < 0) return String(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  if (minutes > 0) return `${minutes}:${pad(seconds)}`;
  return `${seconds}s`;
}
