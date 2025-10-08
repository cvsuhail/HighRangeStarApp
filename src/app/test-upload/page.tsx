"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import FileUpload from "@/components/form/FileUpload";

export default function TestUploadPage() {
  const { user, loading } = useAuth();
  const [uploadResult, setUploadResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleFileSelect = (file: File) => {
    console.log("File selected:", file.name, file.size, file.type);
  };

  const handleUpload = async (file: File) => {
    try {
      console.log("Starting upload...");
      setError("");
      setUploadResult("");

      // Import Firebase Storage functions
      const { getFirebaseStorage } = await import("@/lib/firebase");
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

      const storage = getFirebaseStorage();
      if (!storage) {
        throw new Error("Firebase Storage not initialized");
      }

      console.log("Storage initialized:", storage);

      // Create a test path
      const testThreadId = "test-thread-" + Date.now();
      const storagePath = `purchaseOrders/${testThreadId}/test_${file.name}`;
      console.log("Storage path:", storagePath);

      const storageRef = ref(storage, storagePath);
      console.log("Storage ref created:", storageRef);

      // Upload file
      console.log("Uploading bytes...");
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload complete, getting download URL...");
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("Download URL:", downloadURL);

      setUploadResult(downloadURL);
      console.log("Upload successful!");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Upload Page</h1>
        <p className="text-red-600">Please sign in to test the upload functionality.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Upload Page</h1>
      <p className="text-gray-600 mb-6">
        Testing Firebase Storage upload functionality. User: {user.email}
      </p>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Upload Test File</h2>
          <FileUpload
            onFileSelect={handleFileSelect}
            onUpload={handleUpload}
            accept="application/pdf"
            maxSize={10}
            className="mb-4"
          />
        </div>

        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-semibold mb-2">Upload Successful!</h3>
            <p className="text-green-700 mb-2">Download URL:</p>
            <a
              href={uploadResult}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {uploadResult}
            </a>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">Upload Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-gray-800 font-semibold mb-2">Debug Info</h3>
          <p className="text-sm text-gray-600">
            User: {user.email}<br />
            UID: {user.uid}<br />
            Check browser console for detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
}
