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
import fetchData from "@/lib/fetch";
import { encryptIdUrl } from "@/lib/encryptor";

export default function DetailPengunduranDiri() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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
      const id = decodeURIComponent(params.id);
      
      // Gunakan endpoint GET /api/PengunduranDiri/detail?id={id}
      const response = await fetchData(
        API_LINK + `PengunduranDiri/detail?id=${encodeURIComponent(id)}`,
        {},
        "GET"
      );

      if (response && !response.error) {
        setData(response);
      } else {
        Toast.error(response?.message || "Gagal memuat data");
        router.push("/pages/administrasi-akademik/Page_Administrasi_Pengajuan_Pengunduran_Diri");
      }
    } catch (err) {
      Toast.error("Gagal memuat data: " + err.message);
      router.push("/pages/administrasi-akademik/Page_Administrasi_Pengajuan_Pengunduran_Diri");
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

      if (response && !response.error) {
        Toast.success("Pengajuan berhasil disetujui");
        router.push("/pages/administrasi-akademik/Page_Administrasi_Pengajuan_Pengunduran_Diri");
      } else {
        Toast.error(response?.message || "Gagal menyetujui pengajuan");
      }
    } catch (err) {
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
      // Download file dari endpoint /api/PengunduranDiri/file/{filename}
      window.open(`${API_LINK}PengunduranDiri/file/${encodeURIComponent(fileName)}`, '_blank');
    } else {
      Toast.error("File tidak tersedia");
    }
  };

  const handleLihatProfil = () => {
    const mhsId = data?.mhsId || data?.nim;
    if (mhsId) {
      router.push(`/pages/persiapan-perkuliahan/mahasiswa/detail/${encryptIdUrl(mhsId)}`);
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
            <div className="form-label fw-bold text-muted small">Status</div>
            <div className="fs-6">{data?.status || "-"}</div>
          </div>
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Persetujuan Prodi oleh</div>
            <div className="fs-6">{data?.approvalProdiBy || "-"}</div>
          </div>
          <div className="col-md-4">
            <div className="form-label fw-bold text-muted small">Persetujuan Wakil Direktur 1 oleh</div>
            <div className="fs-6">{data?.approvalDir1By || "-"}</div>
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
          classType="warning"
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
