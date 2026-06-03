"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData } from "@/context/user";
import { decryptIdUrl } from "@/lib/encryptor";

export default function EditPengunduranDiri() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);

  // File upload states
  const [fileSuratPernyataan, setFileSuratPernyataan] = useState(null);
  const [fileLampiran, setFileLampiran] = useState(null);

  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const encryptedId = decodeURIComponent(params.id);
      const id = decryptIdUrl(encryptedId);
      
      if (!id) {
        Toast.error("ID tidak valid");
        router.push("/pages/administrasi-akademik/pengunduran-diri");
        return;
      }
      
      // Get JWT token
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      // Gunakan endpoint GET /api/PengunduranDiri/detail?id={id}
      const res = await fetch(`${API_LINK}PengunduranDiri/detail?id=${encodeURIComponent(id)}`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const response = await res.json();

      if (response) {
        setData(response);
      } else {
        Toast.error("Data tidak ditemukan");
        router.push("/pages/administrasi-akademik/pengunduran-diri");
      }
    } catch (err) {
      Toast.error("Gagal memuat data: " + err.message);
      router.push("/pages/administrasi-akademik/pengunduran-diri");
    } finally {
      setLoading(false);
    }
  };

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

      if (fileType === 'suratPernyataan') {
        setFileSuratPernyataan(file);
      } else if (fileType === 'lampiran') {
        setFileLampiran(file);
      }
    }
  };

  // Upload files ke server dan dapatkan fileName
  const uploadFiles = async (fileSurat, fileLamp) => {
    const formDataUpload = new FormData();
    
    if (fileSurat) {
      formDataUpload.append('lampiranSuratPengajuan', fileSurat);
    }
    if (fileLamp) {
      formDataUpload.append('lampiran', fileLamp);
    }

    const jwtToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('jwtToken='))
      ?.split('=')[1];

    const uploadUrl = `${API_LINK}PengunduranDiri/upload`;

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
      },
      body: formDataUpload
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${res.status} - ${errorText}`);
    }

    const result = await res.json();
    return result;
  };

  const handleSubmit = async () => {
    const confirm = await SweetAlert({
      title: "Update Berkas",
      text: "Apakah Anda yakin ingin menyimpan perubahan berkas?",
      icon: "info",
      confirmText: "Ya, Simpan!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      setSaving(true);

      // Upload file baru jika ada
      let lampiranSuratPengajuanFileName = data?.lampiranSuratPengajuan || "";
      let lampiranFileName = data?.lampiran || "";

      if (fileSuratPernyataan || fileLampiran) {
        const uploadResult = await uploadFiles(fileSuratPernyataan, fileLampiran);
        // Ambil fileName dari response upload
        if (fileSuratPernyataan && uploadResult.lampiranSuratPengajuan) {
          lampiranSuratPengajuanFileName = uploadResult.lampiranSuratPengajuan;
        }
        if (fileLampiran && uploadResult.lampiran) {
          lampiranFileName = uploadResult.lampiran;
        }
      }

      // Prepare request body dengan fileName dari upload
      const requestBody = {
        lampiranSuratPengajuan: lampiranSuratPengajuanFileName,
        lampiran: lampiranFileName
      };

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      // Gunakan endpoint PUT /api/PengunduranDiri/{id}
      const res = await fetch(`${API_LINK}PengunduranDiri/${encodeURIComponent(data.id)}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        Toast.success("Berkas berhasil diperbarui");
        router.push("/pages/administrasi-akademik/pengunduran-diri");
      } else {
        const errorText = await res.text();
        Toast.error("Gagal memperbarui berkas: " + errorText);
      }
    } catch (err) {
      Toast.error("Gagal memperbarui berkas: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainContent layout="Admin" loading={true} title="Edit Pengajuan Pengunduran Diri">
        <div></div>
      </MainContent>
    );
  }

  return (
    <MainContent
      layout="Admin"
      title="Edit Pengajuan Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik - Pengunduran Diri" }
      ]}
    >
      <Card title="Edit Pengajuan Pengunduran Diri">
        {/* Upload Berkas Section */}
        <div className="mb-4">
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            <i className="bi bi-cloud-upload me-2" /> Upload Berkas Pengajuan
          </h6>
          
          <div className="row g-4">
            <div className="col-md-6">
              <div className="upload-section">
                <label htmlFor="suratPernyataan" className="form-label fw-bold mb-2">
                  Berkas Surat Pernyataan
                </label>
                <input
                  id="suratPernyataan"
                  type="file"
                  className="form-control"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('suratPernyataan', e.target.files[0])}
                />
                <small className="text-muted mt-1 d-block">Format: PDF, JPG, PNG. Maksimal: 5MB</small>
                
                {fileSuratPernyataan && (
                  <div className="mt-2">
                    <span className="badge bg-success">
                      <i className="bi bi-file-earmark-check me-1" />
                      {fileSuratPernyataan.name} <small>(Baru)</small>
                    </span>
                  </div>
                )}
                
                {data?.lampiranSuratPengajuan && !fileSuratPernyataan && (
                  <div className="mt-2">
                    <span className="badge bg-info">
                      <i className="bi bi-file-earmark me-1" /> File saat ini tersedia
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <div className="upload-section">
                <label htmlFor="lampiran" className="form-label fw-bold mb-2">
                  Berkas Lampiran
                </label>
                <input
                  id="lampiran"
                  type="file"
                  className="form-control"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('lampiran', e.target.files[0])}
                />
                <small className="text-muted mt-1 d-block">Format: PDF, JPG, PNG. Maksimal: 5MB</small>
                
                {fileLampiran && (
                  <div className="mt-2">
                    <span className="badge bg-success">
                      <i className="bi bi-file-earmark-check me-1" />
                      {fileLampiran.name} <small>(Baru)</small>
                    </span>
                  </div>
                )}
                
                {data?.lampiran && !fileLampiran && (
                  <div className="mt-2">
                    <span className="badge bg-info">
                      <i className="bi bi-file-earmark me-1" /> File saat ini tersedia
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-start gap-2 pt-3 border-top">
          <Button
            classType="secondary"
            label="Kembali"
            onClick={() => router.back()}
          />
          <Button
            classType="success"
            label={saving ? "Menyimpan..." : "Simpan"}
            onClick={handleSubmit}
            iconName="save"
            disabled={saving}
          />
        </div>
      </Card>
    </MainContent>
  );
}
