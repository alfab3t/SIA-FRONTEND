"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData } from "@/context/user";
import fetchData from "@/lib/fetch";
import { encryptIdUrl, decryptIdUrl } from "@/lib/encryptor";

export default function DetailPengunduranDiri() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const getStatusBadge = (status) => {
    return (
      <Badge status={status || "Draft"} customMap={{ 
        "Revisi": "bg-danger-subtle text-danger",
        "Draft": "bg-secondary-subtle text-secondary",
        "Menunggu Upload SK": "bg-warning-subtle text-warning",
        "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
        "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
        "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
      }} />
    );
  };

  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Gunakan endpoint GET /api/PengunduranDiri/detail dengan query params
      const response = await fetchData(
        API_LINK + `PengunduranDiri/detail`,
        { id: id },
        "GET"
      );

      // Handle different response structures
      let actualData = response;
      if (response && typeof response === 'object') {
        // Check if response has data property
        if (response.data) {
          actualData = response.data;
        } else if (response.result) {
          actualData = response.result;
        } else if (Array.isArray(response) && response.length > 0) {
          actualData = response[0];
        }
      }

      if (actualData && !actualData.error) {
        setData(actualData);
      } else {
        Toast.error(actualData?.message || "Gagal memuat data");
        router.push("/pages/administrasi-akademik/pengunduran-diri");
      }
    } catch (err) {
      Toast.error("Gagal memuat data: " + err.message);
      router.push("/pages/administrasi-akademik/pengunduran-diri");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const confirm = await SweetAlert({
      title: "Setujui Pengajuan",
      text: "Apakah Anda yakin ingin menyetujui pengajuan ini?",
      icon: "info",
      confirmText: "Ya, Setujui!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      setProcessing(true);
      const response = await fetchData(
        API_LINK + `PengunduranDiri/Approve/${data.id}`,
        {},
        "PUT"
      );

      // Cek berbagai kemungkinan response sukses
      const isSuccess = response && !response.error && 
                       (response.success === true || 
                        response.status === "success" || 
                        response.message?.toLowerCase().includes("berhasil") ||
                        response.message?.toLowerCase().includes("success") ||
                        !response.message); // Jika tidak ada message, anggap sukses

      if (isSuccess) {
        Toast.success("Pengajuan berhasil disetujui");
        router.push("/pages/administrasi-akademik/pengunduran-diri");
      } else {
        Toast.error(response?.message || "Gagal menyetujui pengajuan");
      }
    } catch (err) {
      console.error("Error approving:", err);
      Toast.error("Gagal menyetujui pengajuan: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const confirm = await SweetAlert({
      title: "Tolak Pengajuan",
      text: "Apakah Anda yakin ingin menolak pengajuan ini?",
      icon: "warning",
      confirmText: "Ya, Tolak!",
      confirmButtonColor: "#dc3545",
    });

    if (!confirm) return;

    try {
      setProcessing(true);
      const response = await fetchData(
        API_LINK + `PengunduranDiri/Reject/${data.id}`,
        {},
        "PUT"
      );

      if (response && !response.error) {
        Toast.success("Pengajuan berhasil ditolak");
        router.push("/pages/administrasi-akademik/Page_Administrasi_Pengajuan_Pengunduran_Diri");
      } else {
        Toast.error(response?.message || "Gagal menolak pengajuan");
      }
    } catch (err) {
      Toast.error("Gagal menolak pengajuan: " + err.message);
    } finally {
      setProcessing(false);
    }
  };



  const handleDownload = (type) => {
    // Ambil nama file dari data
    let fileName = "";
    
    if (type === 'suratPernyataan') {
      fileName = data?.lampiranSuratPengajuan || data?.pdiLampiransuratpengajuan || "";
    } else if (type === 'lampiran') {
      fileName = data?.lampiran || data?.pdiLampiran || "";
    }
    
    if (fileName) {
      // Get JWT token
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      // Download file dengan token
      const downloadUrl = `${API_LINK}PengunduranDiri/file/${encodeURIComponent(fileName)}`;
      
      // Buat fetch request dengan token
      fetch(downloadUrl, {
        method: 'GET',
        headers: {
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Download failed');
        }
        return response.blob();
      })
      .then(blob => {
        // Buat URL untuk blob dan trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Download error:', error);
        Toast.error("Gagal mengunduh file");
      });
    } else {
      Toast.error("File tidak tersedia");
    }
  };

  const handleLihatProfil = () => {
    const mhsId = data?.mhsId || data?.nim;
    if (mhsId) {
      const url = `/pages/persiapan-perkuliahan/mahasiswa/detail/${encryptIdUrl(mhsId)}`;
      window.open(url, '_blank');
    }
  };

  const canApprove = useMemo(() => {
    // Tidak ada tombol approve/reject di halaman detail
    return false;
  }, []);

  if (loading) {
    return (
      <MainContent layout="Admin" loading={true} title="Detail Pengajuan Pengunduran Diri">
        <div></div>
      </MainContent>
    );
  }

  return (
    <MainContent
      layout="Admin"
      title="Detail Pengajuan Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik - Pengunduran Diri" }
      ]}
    >
      <Card title="Detail Pengajuan Pengunduran Diri">
        {/* Row 1: NIM, Mahasiswa, Angkatan */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">NIM</div>
            <div className="fs-6">{data?.mhsId || "-"}</div>
          </div>
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Mahasiswa</div>
            <div className="fs-6">{data?.namaMahasiswa || "-"}</div>
          </div>
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Angkatan</div>
            <div className="fs-6">{data?.angkatan || "-"}</div>
          </div>
        </div>

        {/* Row 2: Surat Pernyataan, Lampiran, Nomor SK */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Surat Pernyataan</div>
            <div>
              {(data?.lampiranSuratPengajuan || data?.pdiLampiransuratpengajuan) ? (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload('suratPernyataan')}
                >
                  <i className="bi bi-download me-1" />
                  {' '}Download
                </button>
              ) : (
                <span className="text-muted">-</span>
              )}
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Lampiran</div>
            <div>
              {(data?.lampiran || data?.pdiLampiran) ? (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload('lampiran')}
                >
                  <i className="bi bi-download me-1" />
                  {' '}Download
                </button>
              ) : (
                <span className="text-muted">-</span>
              )}
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Nomor SK</div>
            <div className="fs-6">{data?.suratNo || data?.noSk || "-"}</div>
          </div>
        </div>

        {/* Row 3: Status, Persetujuan Prodi oleh, Persetujuan Wakil Direktur 1 oleh */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="mb-3">
              <div className="fw-bold mb-1">Status</div>
              <div><Badge status={data?.status || "Draft"} customMap={{ 
                "Revisi": "bg-danger-subtle text-danger",
                "Draft": "bg-secondary-subtle text-secondary",
                "Menunggu Upload SK": "bg-warning-subtle text-warning",
                "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
                "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
                "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
              }} /></div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <div className="fw-bold mb-1">Persetujuan Prodi oleh</div>
              <div>{data?.approvalProdiBy || "-"}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <div className="fw-bold mb-1">Persetujuan Wakil Direktur 1 oleh</div>
              <div>{data?.approvalDir1By || "-"}</div>
            </div>
          </div>
        </div>

        <hr />

        {/* Lihat Profil Mahasiswa */}
        <div className="mb-3">
          <button 
            className="btn btn-link p-0 text-decoration-none"
            onClick={handleLihatProfil}
          >
            <i className="bi bi-eye me-1" />
            {' '}Lihat Profil Mahasiswa
          </button>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="mt-3 d-flex gap-2">
        <Button
          classType="secondary"
          label="Kembali"
          onClick={() => router.back()}
        />

        {canApprove && (
          <>
            <Button
              classType="danger"
              label={processing ? "Memproses..." : "Tolak"}
              onClick={handleReject}
              iconName="x-circle"
              disabled={processing}
            />
            <Button
              classType="success"
              label={processing ? "Memproses..." : "Setujui"}
              onClick={handleApprove}
              iconName="check-circle"
              disabled={processing}
            />
          </>
        )}
      </div>
    </MainContent>
  );
}
