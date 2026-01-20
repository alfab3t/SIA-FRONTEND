"use client";

import { useState, useMemo, useEffect } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";
import { decryptIdUrl, encryptIdUrl } from "@/lib/encryptor";

export default function DetailMeninggalDunia() {
  const router = useRouter();
  const params = useParams();
  const userData = useMemo(() => getUserData(), []);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [error, setError] = useState(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the ID from URL params with proper URL encoding handling
  const recordId = useMemo(() => {
    if (!params?.id) return null;
    
    console.log("=== ID PROCESSING DEBUG ===");
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

  // Load record data with comprehensive error handling
  useEffect(() => {
    if (!recordId) {
      console.log("No recordId available");
      setLoading(false);
      setError("ID tidak valid");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("=== LOADING MENINGGAL DUNIA DETAIL ===");
        console.log("Record ID:", recordId);
        
        // Encode the ID for the API call to handle special characters
        const encodedRecordId = encodeURIComponent(recordId);
        console.log("Encoded Record ID for API:", encodedRecordId);
        console.log("API URL:", `${API_LINK}MeninggalDunia/${encodedRecordId}`);

        // Use backend GET {id} endpoint
        const response = await fetch(`${API_LINK}MeninggalDunia/${encodedRecordId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log("Detail response status:", response.status);
        console.log("Detail response headers:", response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Could not parse error response as JSON, use default message
          }
          
          throw new Error(errorMessage);
        }

        const responseText = await response.text();
        console.log("Raw response text:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Parsed detail data:", data);
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error("Invalid data structure received from server");
        }

        // Log all expected fields for debugging
        console.log("=== BACKEND RESPONSE VALIDATION ===");
        console.log("mhsId:", data.mhsId);
        console.log("mhsNama:", data.mhsNama);
        console.log("konNama:", data.konNama);
        console.log("mhsAngkatan:", data.mhsAngkatan);
        console.log("konSingkatan:", data.konSingkatan);
        console.log("lampiran:", data.lampiran);
        console.log("status:", data.status);
        console.log("createdBy:", data.createdBy);
        console.log("approveDir1Date:", data.approveDir1Date);
        console.log("approveDir1By:", data.approveDir1By);
        console.log("suratNo:", data.suratNo);
        console.log("noSpkb:", data.noSpkb);
        console.log("sk:", data.sk);
        console.log("spkb:", data.spkb);
        
        setDetailData(data);
        
      } catch (error) {
        console.error("Error loading detail:", error);
        setError(error.message);
        Toast.error(`Gagal memuat detail pengajuan: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [recordId]);

  const handleBack = () => {
    // Navigate back to main page
    router.push("/pages/administrasi-akademik/Meninggal-Dunia");
  };

  // ============================
  // NAVIGATE TO PROFILE
  // ============================
  const handleViewProfile = () => {
    if (!detailData?.mhsId) {
      Toast.error("ID Mahasiswa tidak tersedia.");
      return;
    }
    
    try {
      const encryptedMhsId = encryptIdUrl(detailData.mhsId);
      router.push(`/pages/Profil_Mahasiswa/${encryptedMhsId}`);
    } catch (error) {
      console.error("Error encrypting mhsId:", error);
      Toast.error("Gagal membuka profil mahasiswa.");
    }
  };

  // Handle file downloads using backend file endpoint
  const handleDownloadReport = () => {
    if (!recordId || !detailData?.lampiran) {
      Toast.error("File lampiran tidak tersedia untuk didownload.");
      return;
    }
    
    // Use backend file endpoint for downloading lampiran
    const filename = detailData.lampiran;
    const downloadUrl = `${API_LINK}MeninggalDunia/file/${filename}`;
    console.log("Download Lampiran URL:", downloadUrl);
    console.log("Original filename:", filename);
    window.open(downloadUrl, "_blank");
  };

  // Handle SK file download
  const handleDownloadSK = () => {
    if (!recordId || !detailData?.sk) {
      Toast.error("File SK tidak tersedia untuk didownload.");
      return;
    }
    
    // Use backend file endpoint for downloading SK
    const filename = detailData.sk;
    const downloadUrl = `${API_LINK}MeninggalDunia/file/${filename}`;
    console.log("Download SK URL:", downloadUrl);
    console.log("Original SK filename:", filename);
    window.open(downloadUrl, "_blank");
  };

  // Handle SPKB file download  
  const handleDownloadSPKB = () => {
    if (!recordId || !detailData?.spkb) {
      Toast.error("File SPKB tidak tersedia untuk didownload.");
      return;
    }
    
    // Use backend file endpoint for downloading SPKB
    const filename = detailData.spkb;
    const downloadUrl = `${API_LINK}MeninggalDunia/file/${filename}`;
    console.log("Download SPKB URL:", downloadUrl);
    console.log("Original SPKB filename:", filename);
    window.open(downloadUrl, "_blank");
  };

  // Status badge styling
  const getStatusBadgeClass = (status) => {
    if (!status) return 'badge bg-light text-dark';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'draft':
        return 'badge bg-secondary';
      case 'disetujui':
        return 'badge bg-success';
      case 'ditolak':
        return 'badge bg-danger';
      case 'belum disetujui prodi':
        return 'badge bg-warning text-dark';
      case 'belum disetujui wadir 1':
        return 'badge bg-warning text-dark';
      case 'belum disetujui finance':
        return 'badge bg-warning text-dark';
      case 'menunggu upload sk':
        return 'badge bg-info';
      default:
        return 'badge bg-light text-dark';
    }
  };

  if (!mounted) {
    return (
      <MainContent
        title="Detail Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Detail Pengajuan" },
        ]}
      >
        <div className="text-center py-4">
          <div className="spinner-border" aria-live="polite">
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
        title="Detail Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Detail Pengajuan" },
        ]}
      >
        <div className="text-center py-4">
          <div className="spinner-border" aria-live="polite">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat data pengajuan...</p>
        </div>
      </MainContent>
    );
  }

  if (error || !detailData) {
    return (
      <MainContent
        title="Detail Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Detail Pengajuan" },
        ]}
      >
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
          </div>
          <h5 className="text-muted">Data tidak ditemukan</h5>
          <p className="text-muted">
            {error || "Pengajuan meninggal dunia tidak dapat ditemukan."}
          </p>
          <div className="mt-3">
            <Button
              classType="primary"
              label="Kembali"
              onClick={handleBack}
            />
          </div>
          <div className="mt-3">
            <small className="text-muted">
              ID yang dicari: {recordId}
            </small>
          </div>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent
      title="Detail Pengajuan Meninggal Dunia"
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Meninggal Dunia" },
        { label: "Detail Pengajuan" },
      ]}
    >
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="fas fa-info-circle me-2"></i>
            <span>Informasi Pengajuan Meninggal Dunia</span>
          </h5>
        </div>
        <div className="card-body">
          {/* Data Mahasiswa */}
          <div className="row mb-4">
            <div className="col-12">
              <h6 className="text-primary border-bottom pb-2 mb-3">
                <i className="fas fa-user me-2"></i>Data Mahasiswa
              </h6>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">ID Mahasiswa:</h6>
              <p className="form-control-plaintext">{detailData.mhsId || '-'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">Nama Mahasiswa:</h6>
              <p className="form-control-plaintext">{detailData.mhsNama || '-'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">Program Studi:</h6>
              <p className="form-control-plaintext">{detailData.konNama || '-'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">Singkatan Prodi:</h6>
              <p className="form-control-plaintext">{detailData.konSingkatan || '-'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">Tahun Angkatan:</h6>
              <p className="form-control-plaintext">{detailData.mhsAngkatan || '-'}</p>
            </div>
            <div className="col-md-12 mb-3">
              <button 
                type="button"
                className="btn btn-link p-0 text-primary text-decoration-underline" 
                onClick={handleViewProfile}
              >
                Lihat Profil Mahasiswa
              </button>
            </div>
          </div>

          {/* Data Pengajuan */}
          <div className="row mb-4">
            <div className="col-12">
              <h6 className="text-primary border-bottom pb-2 mb-3">
                <i className="fas fa-file-alt me-2"></i>Data Pengajuan
              </h6>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">Status:</h6>
              <p className="form-control-plaintext">
                <span className={getStatusBadgeClass(detailData.status)}>
                  {detailData.status || 'Status tidak diketahui'}
                </span>
              </p>
            </div>
            <div className="col-md-6 mb-3">
              <h6 className="fw-bold">Dibuat Oleh:</h6>
              <p className="form-control-plaintext">
                {(() => {
                  const createdBy = detailData.createdBy || '';
                  
                  // Jika createdBy adalah 'system', coba ambil dari userData
                  if (createdBy.toLowerCase() === 'system') {
                    // Tampilkan username user yang sedang login jika tersedia
                    if (userData?.username) {
                      return userData.username;
                    }
                    // Atau tampilkan nama user jika username tidak ada
                    if (userData?.nama) {
                      return userData.nama;
                    }
                    return 'System';
                  }
                  
                  // Tampilkan createdBy asli jika ada dan bukan kosong
                  if (createdBy && createdBy !== '-') {
                    return createdBy;
                  }
                  
                  // Fallback ke username user saat ini jika tersedia
                  if (userData?.username) {
                    return userData.username;
                  }
                  
                  return '-';
                })()}
              </p>
            </div>
            <div className="col-md-12 mb-3">
              <h6 className="fw-bold">Lampiran File:</h6>
              <p className="form-control-plaintext mb-2">
                {detailData.lampiran || 'Tidak ada file'}
              </p>
              {detailData.lampiran && (
                <Button
                  classType="outline-primary"
                  label="Download Lampiran"
                  onClick={handleDownloadReport}
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* Data Persetujuan */}
          {(detailData.approveDir1Date || detailData.approveDir1By) && (
            <div className="row mb-4">
              <div className="col-12">
                <h6 className="text-primary border-bottom pb-2 mb-3">
                  <i className="fas fa-check-circle me-2"></i>Data Persetujuan
                </h6>
              </div>
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold">Tanggal Persetujuan Wadir 1:</h6>
                <p className="form-control-plaintext">{detailData.approveDir1Date || '-'}</p>
              </div>
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold">Disetujui Oleh:</h6>
                <p className="form-control-plaintext">{detailData.approveDir1By || '-'}</p>
              </div>
            </div>
          )}

          {/* Data Surat & Dokumen */}
          {(detailData.suratNo || detailData.noSpkb || detailData.sk || detailData.spkb) && (
            <div className="row mb-4">
              <div className="col-12">
                <h6 className="text-primary border-bottom pb-2 mb-3">
                  <i className="fas fa-file-contract me-2"></i>Data Surat & Dokumen
                </h6>
              </div>
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold">Nomor Surat:</h6>
                <p className="form-control-plaintext">{detailData.suratNo || '-'}</p>
              </div>
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold">Nomor SPKB:</h6>
                <p className="form-control-plaintext">{detailData.noSpkb || '-'}</p>
              </div>
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold">File SK:</h6>
                <p className="form-control-plaintext mb-2">
                  {detailData.sk ? detailData.sk : 'Belum ada file SK'}
                </p>
                {detailData.sk && (
                  <Button
                    classType="outline-success"
                    label="Download SK"
                    onClick={handleDownloadSK}
                    size="sm"
                  />
                )}
              </div>
              <div className="col-md-6 mb-3">
                <h6 className="fw-bold">File SPKB:</h6>
                <p className="form-control-plaintext mb-2">
                  {detailData.spkb ? detailData.spkb : 'Belum ada file SPKB'}
                </p>
                {detailData.spkb && (
                  <Button
                    classType="outline-success"
                    label="Download SPKB"
                    onClick={handleDownloadSPKB}
                    size="sm"
                  />
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex justify-content-end mt-4">
            <Button
              classType="secondary"
              label="Kembali"
              onClick={handleBack}
            />
          </div>
        </div>
      </div>
    </MainContent>
  );
}