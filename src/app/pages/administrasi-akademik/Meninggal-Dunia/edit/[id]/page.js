"use client";

import { useState, useMemo, useEffect } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import Label from "@/components/common/Label";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";
import { decryptIdUrl } from "@/lib/encryptor";

export default function EditMeninggalDunia() {
  const router = useRouter();
  const params = useParams();
  const userData = useMemo(() => getUserData(), []);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingData, setExistingData] = useState(null);

  const [formData, setFormData] = useState({
    lampiranMeninggal: null,
    existingLampiran: "", // To store existing file name
    mhsId: "", // Keep for backend submission
  });

  const [errors, setErrors] = useState({});

  // Get the ID from URL params with proper URL encoding handling
  const recordId = useMemo(() => {
    if (!params?.id) return null;
    
    console.log("=== EDIT ID PROCESSING DEBUG ===");
    console.log("Raw params.id:", params.id);
    
    try {
      // First decode the URL encoding
      const urlDecodedId = decodeURIComponent(params.id);
      console.log("URL decoded ID:", urlDecodedId);
      
      // Then try to decrypt (for encrypted IDs from main page)
      const decryptedId = decryptIdUrl(urlDecodedId);
      console.log("Decrypted ID:", decryptedId);
      return decryptedId;
    } catch (decryptError) {
      console.log("Decryption failed, trying direct URL decode:", decryptError);
      try {
        // Fallback to just URL decoding
        const decodedId = decodeURIComponent(params.id);
        console.log("Final decoded ID:", decodedId);
        return decodedId;
      } catch (urlError) {
        console.log("URL decoding also failed, using original:", urlError);
        return params.id;
      }
    }
  }, [params?.id]);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load existing data
  useEffect(() => {
    if (!recordId) {
      setLoading(false);
      Toast.error("ID tidak valid");
      return;
    }

    const loadExistingData = async () => {
      setLoading(true);
      try {
        console.log("=== LOADING EXISTING MENINGGAL DUNIA DATA ===");
        console.log("Record ID:", recordId);
        
        // Encode the ID for the API call to handle special characters
        const encodedRecordId = encodeURIComponent(recordId);
        console.log("Encoded Record ID for API:", encodedRecordId);
        
        const response = await fetch(`${API_LINK}MeninggalDunia/${encodedRecordId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log("Edit data response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Existing data received:", data);
        
        setExistingData(data);
        
        // Populate form with existing data (only file info and mhsId for backend)
        setFormData({
          lampiranMeninggal: null, // File input will be empty initially
          existingLampiran: data.lampiran || "", // Store existing file name
          mhsId: data.mhsId || "", // Keep for backend submission
        });
        
      } catch (error) {
        console.error("Error loading existing data:", error);
        Toast.error(`Gagal memuat data: ${error.message}`);
        router.push("/pages/administrasi-akademik/Meninggal-Dunia");
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [recordId, router]);

  // -------------------------------------------
  // INPUT HANDLER
  // -------------------------------------------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (files && files[0]) {
      const file = files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      // Validate file size
      if (file.size > maxSize) {
        Toast.error(`File ${file.name} terlalu besar. Maksimal 10MB.`);
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        Toast.error(`Format file ${file.name} tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG.`);
        e.target.value = ''; // Clear the input
        return;
      }
      
      console.log(`File ${name} selected:`, file.name, file.size, file.type);
      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error when user types/selects
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // -------------------------------------------
  // VALIDASI - Only validate file in edit mode
  // -------------------------------------------
  const validate = () => {
    const newErrors = {};
    
    // In edit mode, only validate file if no existing file and no new file
    if (!formData.lampiranMeninggal && !formData.existingLampiran) {
      newErrors.lampiranMeninggal = "Lampiran file meninggal dunia wajib di-upload.";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      Toast.error("Mohon lengkapi semua field yang wajib diisi.");
      return false;
    }
    
    return true;
  };

  // -------------------------------------------
  // SUBMIT
  // -------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);

    try {
      const fd = new FormData();
      
      // Add the fields that match the backend DTO
      fd.append("MhsId", formData.mhsId);
      
      // Add the file only if a new file is selected
      if (formData.lampiranMeninggal && formData.lampiranMeninggal instanceof File) {
        fd.append("LampiranFile", formData.lampiranMeninggal, formData.lampiranMeninggal.name);
        console.log("New lampiran file:", formData.lampiranMeninggal.name, formData.lampiranMeninggal.size);
      }

      console.log("EDIT FORM DATA SEND =", {
        MhsId: formData.mhsId,
        LampiranFile: formData.lampiranMeninggal?.name || "No new file",
        ExistingFile: formData.existingLampiran
      });

      // Encode the ID for the API call to handle special characters
      const encodedRecordId = encodeURIComponent(recordId);
      const res = await fetch(`${API_LINK}MeninggalDunia/${encodedRecordId}`, {
        method: "PUT",
        body: fd,
      });

      console.log("Edit response status:", res.status);

      const raw = await res.text();
      console.log("RAW EDIT RESPONSE =", raw);

      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        if (res.ok) {
          Toast.success("Data berhasil diperbarui.");
          router.push("/pages/administrasi-akademik/Meninggal-Dunia");
          return;
        } else {
          Toast.error("Server mengirim response tidak valid:\n\n" + raw);
          return;
        }
      }

      if (res.ok) {
        Toast.success(result?.message || "Data berhasil diperbarui.");
        router.push("/pages/administrasi-akademik/Meninggal-Dunia");
      } else {
        Toast.error(result?.message || "Gagal memperbarui data.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      Toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => router.back();

  if (!mounted) {
    return (
      <MainContent
        title="Edit Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Edit Pengajuan" },
        ]}
      >
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat halaman...</p>
        </div>
      </MainContent>
    );
  }

  if (loading) {
    return (
      <MainContent
        title="Edit Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Edit Pengajuan" },
        ]}
      >
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat data pengajuan...</p>
        </div>
      </MainContent>
    );
  }

  if (!existingData) {
    return (
      <MainContent
        title="Edit Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Edit Pengajuan" },
        ]}
      >
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
          </div>
          <h5 className="text-muted">Data tidak ditemukan</h5>
          <p className="text-muted">Pengajuan meninggal dunia tidak dapat ditemukan.</p>
          <div className="mt-3">
            <Button
              classType="primary"
              label="Kembali"
              onClick={handleCancel}
            />
          </div>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent
      title="Edit Pengajuan Meninggal Dunia"
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Meninggal Dunia" },
        { label: "Edit Pengajuan" },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <div className="row mt-3">
          <div className="col-lg-12">
            <Label
              text="Lampiran File Meninggal Dunia"
              htmlFor="lampiranMeninggal"
              required={true}
            />
            
            <input
              type="file"
              id="lampiranMeninggal"
              name="lampiranMeninggal"
              className="form-control"
              onChange={handleChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            
            {/* Show existing file info below the input */}
            {formData.existingLampiran && (
              <div className="mt-2">
                <small className="text-muted">File saat ini: </small>
                <span className="text-dark">{formData.existingLampiran}</span>
              </div>
            )}
            
            {errors.lampiranMeninggal && (
              <span className="fw-normal text-danger">{errors.lampiranMeninggal}</span>
            )}
            <small className="text-muted d-block mt-1">
              Format yang didukung: PDF, JPG, JPEG, PNG (Maksimal 10MB)
              {formData.existingLampiran && <br />}
              {formData.existingLampiran && ""}
            </small>
          </div>
        </div>

        <div className="d-flex justify-content-end mt-4 gap-2">
          <Button
            classType="secondary"
            label="Batal"
            type="button"
            onClick={handleCancel}
            isDisabled={saving}
          />
          <Button
            classType="primary"
            iconName="save"
            label={saving ? "Menyimpan..." : "Simpan Editor"}
            type="submit"
            isDisabled={saving}
          />
        </div>
      </form>
    </MainContent>
  );
}