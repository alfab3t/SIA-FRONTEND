"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Loading from "@/components/common/Loading";
import Toast from "@/components/common/Toast";
import { Avatar } from "@/components/common/Img";
import Badge from "@/components/common/Badge";
import { API_LINK } from "@/lib/constant";

export default function ProfilMahasiswa() {
  const searchParams = useSearchParams();
  const mhsId = searchParams.get('mhsId');
  
  const [profilData, setProfilData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (mhsId) {
      loadProfilMahasiswa(mhsId);
    } else {
      Toast.error("ID Mahasiswa tidak ditemukan");
      setIsLoading(false);
    }
  }, [mhsId]);

  const loadProfilMahasiswa = async (mahasiswaId) => {
    try {
      console.log("Loading profil for mahasiswa:", mahasiswaId);
      const endpoint = `${API_LINK}DropOut/mahasiswa-profil?mhsId=${mahasiswaId}`;
      console.log("Profil endpoint:", endpoint);
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Profil response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Profil error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Raw profil data:", data);
      
      setProfilData(data);
      Toast.success("Profil mahasiswa berhasil dimuat");
    } catch (err) {
      console.error("Error loading profil:", err);
      Toast.error("Gagal memuat profil mahasiswa: " + err.message);
      setProfilData(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainContent
        layout="Admin"
        title="Profil Mahasiswa"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Profil Mahasiswa" }
        ]}
      >
        <Loading loading={true} message="Memuat profil mahasiswa..." />
      </MainContent>
    );
  }

  if (!profilData) {
    return (
      <MainContent
        layout="Admin"
        title="Profil Mahasiswa"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Profil Mahasiswa" }
        ]}
      >
        <Card title="Profil Mahasiswa">
          <div className="text-center py-5">
            <i className="bi bi-person-x fs-1 text-muted"></i>
            <h5 className="mt-3 text-muted">Data profil mahasiswa tidak ditemukan</h5>
            <p className="text-muted">Silakan coba lagi atau hubungi administrator</p>
          </div>
        </Card>
      </MainContent>
    );
  }

  return (
    <MainContent
      layout="Admin"
      title="Profil Mahasiswa"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Profil Mahasiswa" }
      ]}
    >
      <div className="row g-4">
        {/* Profile Header Card */}
        <div className="col-12">
          <Card>
            <div className="row align-items-center">
              <div className="col-md-3 text-center">
                <Avatar 
                  name={profilData.nama || profilData.name || "Mahasiswa"} 
                  size={120} 
                />
                <div className="mt-3">
                  <Badge status={profilData.status || "Aktif"} />
                </div>
              </div>
              <div className="col-md-9">
                <h3 className="fw-bold text-primary mb-1">
                  {profilData.nama || "Nama tidak tersedia"}
                </h3>
                <h5 className="text-muted mb-3">
                  NIM: {mhsId}
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-mortarboard text-primary me-2"></i>
                      <span className="fw-medium">Program Studi:</span>
                      <span className="ms-2">{profilData.prodiKonsentrasi || "Manajemen Informatika"}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-people text-primary me-2"></i>
                      <span className="fw-medium">Kelas:</span>
                      <span className="ms-2">{profilData.kelas || "Tidak tersedia"}</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-calendar-check text-primary me-2"></i>
                      <span className="fw-medium">Angkatan:</span>
                      <span className="ms-2">{profilData.angkatan || "2024"}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-award text-primary me-2"></i>
                      <span className="fw-medium">Status:</span>
                      <span className="ms-2">
                        <Badge status="Aktif" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Academic Information */}
        <div className="col-md-6">
          <Card title="Informasi Akademik">
            <div className="row g-3">
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Program Studi & Konsentrasi</small>
                  <div className="fw-medium">
                    {profilData.prodiKonsentrasi || "Manajemen Informatika (MI)"}
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Angkatan</small>
                  <div className="fw-medium">
                    <span className="badge bg-success fs-6 px-3 py-2 rounded-pill">
                      <i className="bi bi-calendar-check me-1"></i>
                      {profilData.angkatan}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Kelas</small>
                  <div className="fw-medium">
                    <span className="badge bg-info fs-6 px-3 py-2 rounded-pill">
                      <i className="bi bi-people me-1"></i>
                      {profilData.kelas || "Tidak tersedia"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">NIM</small>
                  <div className="fw-medium">
                    <code className="bg-light px-2 py-1 rounded">{mhsId}</code>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Student Information */}
        <div className="col-md-6">
          <Card title="Informasi Mahasiswa">
            <div className="row g-3">
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Nama Lengkap</small>
                  <div className="fw-medium">
                    <i className="bi bi-person text-primary me-2"></i>
                    {profilData.nama || "Nama tidak tersedia"}
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Email Mahasiswa</small>
                  <div className="fw-medium">
                    <i className="bi bi-envelope text-primary me-2"></i>
                    {`${mhsId}@student.astratech.ac.id`}
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Status Mahasiswa</small>
                  <div className="fw-medium">
                    <Badge status="Aktif" />
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="border-bottom pb-2 mb-3">
                  <small className="text-muted">Tahun Masuk</small>
                  <div className="fw-medium">
                    <i className="bi bi-calendar-event text-primary me-2"></i>
                    {profilData.angkatan || "2024"}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Additional Information */}
        <div className="col-12">
          <Card title="Informasi Tambahan">
            <div className="row g-4">
              <div className="col-md-4">
                <div className="text-center p-3 bg-light rounded">
                  <i className="bi bi-mortarboard fs-1 text-primary"></i>
                  <h6 className="mt-2 mb-1">Program Studi</h6>
                  <p className="text-muted small mb-0">{profilData.prodiKonsentrasi}</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-3 bg-light rounded">
                  <i className="bi bi-calendar-check fs-1 text-success"></i>
                  <h6 className="mt-2 mb-1">Angkatan</h6>
                  <p className="text-muted small mb-0">{profilData.angkatan}</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-3 bg-light rounded">
                  <i className="bi bi-people fs-1 text-info"></i>
                  <h6 className="mt-2 mb-1">Kelas</h6>
                  <p className="text-muted small mb-0">{profilData.kelas || "Tidak tersedia"}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainContent>
  );
}