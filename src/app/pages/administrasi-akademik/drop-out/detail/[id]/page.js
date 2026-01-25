"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import fetchData from "@/lib/fetch";
import { API_LINK } from "@/lib/constant";
import { getSSOData } from "@/context/user";

export default function DetailDropOut() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const id = decodeURIComponent(params.id);
      
      const response = await fetchData(
        API_LINK + `DropOut/detail`,
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
      
      setData(actualData);
    } catch (err) {
      console.error("Load data error:", err);
      Toast.error("Gagal memuat detail: " + err.message);
      router.push("/pages/administrasi-akademik/drop-out");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/pages/administrasi-akademik/drop-out");
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Draft") return "bg-secondary";
    if (status === "Disetujui") return "bg-success";
    if (status === "Ditolak") return "bg-danger";
    return "bg-warning";
  };

  if (loading) return null;

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Detail Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik - Drop Out" }
      ]}
    >
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-4">Detail Pengajuan Drop Out</h5>
          
          {data && (
            <>
              {/* Row 1: Mahasiswa, Program Studi, Angkatan */}
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Mahasiswa</div>
                    <span>{data.mhsText || data.mhstext || "-"}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Program Studi</div>
                    <span>{data.prodi || "-"}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Angkatan</div>
                    <span>{data.angkatan || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Status, Menimbang, Mengingat */}
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Status</div>
                    <span className={`badge ${getStatusBadgeClass(data.status || data.dro_status)}`}>
                      {data.status || data.dro_status || "-"}
                    </span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Menimbang</div>
                    <div 
                      className="text-muted"
                      dangerouslySetInnerHTML={{ __html: data.menimbang || "-" }}
                      style={{ fontSize: '0.95rem' }}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Mengingat</div>
                    <div 
                      className="text-muted"
                      dangerouslySetInnerHTML={{ __html: data.mengingat || "-" }}
                      style={{ fontSize: '0.95rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Persetujuan Wakil Direktur I (if exists) */}
              {data.approveWadir1By && (
                <div className="row mb-4">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <div className="fw-bold mb-1">Persetujuan Wakil Direktur I</div>
                      <span>{data.approveWadir1Date || "-"} ({data.approveWadir1By || "-"})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Reason (if exists) */}
              {data.alasanTolak && (
                <div className="row mb-4">
                  <div className="col-md-12">
                    <div className="alert alert-danger mb-0">
                      <strong>Alasan Penolakan:</strong> {data.alasanTolak}
                    </div>
                  </div>
                </div>
              )}

              {/* Link to Profile */}
              <div className="row">
                <div className="col-md-12">
                  <button 
                    type="button"
                    className="btn btn-link text-primary text-decoration-none p-0"
                    onClick={() => {
                      // Navigate to mahasiswa profile if needed
                    }}
                  >
                    <i className="bi bi-person-circle me-1"></i> Lihat Profil Mahasiswa
                  </button>
                </div>
              </div>
            </>
          )}

          {!data && !loading && (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2" /> Data tidak ditemukan
            </div>
          )}
        </div>
      </div>

      {/* Button Kembali */}
      <div className="mt-3">
        <button 
          className="btn btn-secondary"
          onClick={handleBack}
        >
          Kembali
        </button>
      </div>
    </MainContent>
  );
}