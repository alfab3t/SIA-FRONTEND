"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";

export default function UploadSKPengunduranDiri() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [uploading, setUploading] = useState(false);
  const [fileSK, setFileSK] = useState(null);
  const [fileSuratKeterangan, setFileSuratKeterangan] = useState(null);

  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    // Check if user is admin using roleId
    const roleId = userData?.roleId || "";
    const isAdmin = roleId === "ROL21";
    
    if (!isAdmin) {
      Toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push("/pages/administrasi-akademik/pengunduran-diri");
      return;
    }
  }, [params.id, ssoData, userData, router]);

  const handleFileChange = (fileType, file) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        Toast.error("Format file tidak didukung. Gunakan PDF, JPG, atau PNG.");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Toast.error("Ukuran file maksimal 5MB");
        return;
      }
      
      if (fileType === 'sk') {
        setFileSK(file);
      } else if (fileType === 'suratKeterangan') {
        setFileSuratKeterangan(file);
      }
    }
  };

  const handleSubmit = async () => {
    if (!fileSK) {
      Toast.error("Berkas SK Pengunduran Diri wajib diunggah");
      return;
    }
    if (!fileSuratKeterangan) {
      Toast.error("Berkas Surat Keterangan Pernah Berkuliah wajib diunggah");
      return;
    }

    const confirm = await SweetAlert({
      title: "Upload SK",
      text: "Apakah Anda yakin ingin mengupload berkas ini?",
      icon: "info",
      confirmText: "Ya, Simpan!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      setUploading(true);
      const id = decodeURIComponent(params.id);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("PdiId", id);
      formData.append("SkFile", fileSK);
      formData.append("SkpbFile", fileSuratKeterangan);

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      const res = await fetch(`${API_LINK}PengunduranDiri/upload-sk-file`, {
        method: "POST",
        headers: {
          ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
        },
        body: formData
      });

      if (res.ok) {
        Toast.success("Berkas berhasil diupload");
        router.push("/pages/administrasi-akademik/pengunduran-diri");
      } else {
        const errorText = await res.text();
        Toast.error("Gagal mengupload berkas: " + errorText);
      }
    } catch (err) {
      console.error("Upload error:", err);
      Toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <MainContent
      layout="Admin"
      title="Upload SK Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik - Pengunduran Diri" }
      ]}
    >
      <Card title="Upload SK Pengunduran Diri">
        <div className="row g-4">
          {/* Berkas SK Pengunduran Diri */}
          <div className="col-md-6">
            <label htmlFor="fileSK" className="form-label fw-bold text-primary">
              Berkas SK Pengunduran Diri <span className="text-danger">*</span>
            </label>
            <input
              id="fileSK"
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange('sk', e.target.files[0])}
            />
            {fileSK && (
              <div className="mt-2">
                <span className="badge bg-success">
                  <i className="bi bi-file-earmark-check me-1"></i>
                  {fileSK.name}
                </span>
              </div>
            )}
          </div>

          {/* Berkas Surat Keterangan Pernah Berkuliah */}
          <div className="col-md-6">
            <label htmlFor="fileSuratKeterangan" className="form-label fw-bold text-primary">
              Berkas Surat Keterangan Pernah Berkuliah <span className="text-danger">*</span>
            </label>
            <input
              id="fileSuratKeterangan"
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange('suratKeterangan', e.target.files[0])}
            />
            {fileSuratKeterangan && (
              <div className="mt-2">
                <span className="badge bg-success">
                  <i className="bi bi-file-earmark-check me-1"></i>
                  {fileSuratKeterangan.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 d-flex gap-2">
          <Button
            classType="secondary"
            label="Batal"
            onClick={() => router.back()}
          />
          <Button
            classType="primary"
            label={uploading ? "Menyimpan..." : "Simpan"}
            onClick={handleSubmit}
            disabled={uploading}
          />
        </div>
      </Card>
    </MainContent>
  );
}