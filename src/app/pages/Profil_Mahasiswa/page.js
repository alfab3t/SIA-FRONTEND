"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PropTypes from "prop-types";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Loading from "@/components/common/Loading";
import Toast from "@/components/common/Toast";
import { Avatar } from "@/components/common/Img";
import Badge from "@/components/common/Badge";
import { API_LINK } from "@/lib/constant";

const InfoItem = ({ label, value, icon }) => (
  <div className="d-flex align-items-start mb-3">
    {icon && <i className={`bi ${icon} text-primary me-2 mt-1`} />}
    <div className="flex-grow-1">
      <small className="text-muted d-block">{label}</small>
      <span className="fw-medium">{value || "-"}</span>
    </div>
  </div>
);

InfoItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  icon: PropTypes.string
};

const SectionCard = ({ title, icon, children }) => (
  <div className="card border-0 shadow-sm mb-4">
    <div className="card-header bg-white border-bottom">
      <h6 className="mb-0 fw-bold">
        <i className={`bi ${icon} text-primary me-2`} /> {title}
      </h6>
    </div>
    <div className="card-body">{children}</div>
  </div>
);

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

export default function ProfilMahasiswa() {
  const searchParams = useSearchParams();
  const mhsId = searchParams.get('mhsId');
  const source = searchParams.get('source') || 'dropout'; // 'dropout' atau 'pengunduran'
  
  const [profilData, setProfilData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pribadi');

  useEffect(() => {
    if (mhsId) {
      loadProfilMahasiswa(mhsId);
    } else {
      Toast.error("ID Mahasiswa tidak ditemukan");
      setIsLoading(false);
    }
  }, [mhsId, source]);

  const loadProfilMahasiswa = async (mahasiswaId) => {
    try {
      // Gunakan endpoint sesuai source
      const endpoint = source === 'pengunduran' 
        ? `${API_LINK}PengunduranDiri/mahasiswa/${mahasiswaId}/profil`
        : `${API_LINK}DropOut/mahasiswa/${mahasiswaId}/profil`;
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setProfilData(data);
    } catch (err) {
      console.error("Error loading profil mahasiswa:", err);
      Toast.error("Gagal memuat profil mahasiswa");
      setProfilData(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainContent layout="Admin" title="Profil Mahasiswa" breadcrumb={[{ label: "Profil Mahasiswa" }]}>
        <Loading loading={true} message="Memuat profil mahasiswa..." />
      </MainContent>
    );
  }

  if (!profilData) {
    return (
      <MainContent layout="Admin" title="Profil Mahasiswa" breadcrumb={[{ label: "Profil Mahasiswa" }]}>
        <Card title="Profil Mahasiswa">
          <div className="text-center py-5">
            <i className="bi bi-person-x fs-1 text-muted" />
            <h5 className="mt-3 text-muted">Data profil tidak ditemukan</h5>
          </div>
        </Card>
      </MainContent>
    );
  }

  return (
    <MainContent layout="Admin" title="Profil Mahasiswa" breadcrumb={[{ label: "Profil Mahasiswa" }]}>
      {/* Header Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-2 text-center">
              <Avatar name={profilData.mhsNama || "Mahasiswa"} size={100} />
              <div className="mt-2">
                <Badge status={profilData.statusKuliah || "Aktif"} />
              </div>
            </div>
            <div className="col-md-10">
              <h4 className="fw-bold text-primary mb-1">{profilData.mhsNama || "-"}</h4>
              <h6 className="text-muted mb-3">NIM: {profilData.mhsId || mhsId}</h6>
              <div className="row">
                <div className="col-md-4">
                  <small className="text-muted">Program Studi</small>
                  <div className="fw-medium">{profilData.prodi || "-"}</div>
                </div>
                <div className="col-md-4">
                  <small className="text-muted">Angkatan</small>
                  <div className="fw-medium">{profilData.angkatan || "-"}</div>
                </div>
                <div className="col-md-4">
                  <small className="text-muted">Dosen Wali</small>
                  <div className="fw-medium">{profilData.dosenWali || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'pribadi' ? 'active' : ''}`} onClick={() => setActiveTab('pribadi')}>
            <i className="bi bi-person me-1"></i> Data Pribadi
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'akademik' ? 'active' : ''}`} onClick={() => setActiveTab('akademik')}>
            <i className="bi bi-mortarboard me-1"></i> Akademik
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'pendidikan' ? 'active' : ''}`} onClick={() => setActiveTab('pendidikan')}>
            <i className="bi bi-book me-1"></i> Riwayat Pendidikan
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'orangtua' ? 'active' : ''}`} onClick={() => setActiveTab('orangtua')}>
            <i className="bi bi-people me-1"></i> Data Orang Tua
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === 'pribadi' && (
        <div className="row">
          <div className="col-md-6">
            <SectionCard title="Identitas" icon="bi-person-badge">
              <div className="row">
                <div className="col-6"><InfoItem label="NIM" value={profilData.mhsId} /></div>
                <div className="col-6"><InfoItem label="NIK" value={profilData.nik?.trim()} /></div>
                <div className="col-6"><InfoItem label="NISN" value={profilData.nisn} /></div>
                <div className="col-6"><InfoItem label="Jenis Kelamin" value={profilData.jenisKelamin} /></div>
                <div className="col-12"><InfoItem label="Tempat, Tanggal Lahir" value={profilData.ttl} /></div>
                <div className="col-6"><InfoItem label="Agama" value={profilData.agama} /></div>
                <div className="col-6"><InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraan} /></div>
                <div className="col-6"><InfoItem label="Golongan Darah" value={profilData.golonganDarah} /></div>
                <div className="col-6"><InfoItem label="Status Kawin" value={profilData.statusKawin} /></div>
              </div>
            </SectionCard>
          </div>
          <div className="col-md-6">
            <SectionCard title="Kontak & Alamat" icon="bi-geo-alt">
              <InfoItem label="Alamat" value={profilData.alamat} />
              <div className="row">
                <div className="col-6"><InfoItem label="Kode Pos" value={profilData.kodepos} /></div>
                <div className="col-6"><InfoItem label="No. HP" value={profilData.hp} /></div>
              </div>
              <InfoItem label="Email" value={profilData.email} />
            </SectionCard>
            <SectionCard title="Data Fisik" icon="bi-heart-pulse">
              <div className="row">
                <div className="col-4"><InfoItem label="Tinggi Badan" value={profilData.tinggiBadan ? `${profilData.tinggiBadan} cm` : "-"} /></div>
                <div className="col-4"><InfoItem label="Berat Badan" value={profilData.beratBadan ? `${profilData.beratBadan} kg` : "-"} /></div>
                <div className="col-4"><InfoItem label="Ukuran Sepatu" value={profilData.ukuranSepatu} /></div>
                <div className="col-6"><InfoItem label="Ukuran Kemeja" value={profilData.ukuranKemeja} /></div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'akademik' && (
        <div className="row">
          <div className="col-md-6">
            <SectionCard title="Status Akademik" icon="bi-mortarboard">
              <InfoItem label="Program Studi" value={profilData.prodi} />
              <InfoItem label="Angkatan" value={profilData.angkatan} />
              <InfoItem label="Jalur Masuk" value={profilData.jalurMasuk} />
              <InfoItem label="Status Kuliah" value={profilData.statusKuliah} />
              <InfoItem label="Status Beasiswa" value={profilData.statusBeasiswa} />
              <InfoItem label="Dosen Wali" value={profilData.dosenWali} />
            </SectionCard>
          </div>
          <div className="col-md-6">
            <SectionCard title="Virtual Account" icon="bi-credit-card">
              <InfoItem label="VA SPP" value={profilData.vaSpp?.trim()} />
              <InfoItem label="VA Sumbangan" value={profilData.vaSumbangan?.trim()} />
              <InfoItem label="VA Wisuda" value={profilData.vaWisuda?.trim()} />
              <InfoItem label="VA Cuti" value={profilData.vaCuti?.trim()} />
              <InfoItem label="VA ID Card" value={profilData.vaIdcard?.trim()} />
              <InfoItem label="VA Lainnya" value={profilData.vaLainnya?.trim()} />
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'pendidikan' && (
        <div className="row">
          <div className="col-md-6">
            <SectionCard title="Pendidikan Formal" icon="bi-building">
              <InfoItem label="SD" value={`${profilData.sd || "-"} (Lulus: ${profilData.sdTahunLulus || "-"})`} />
              <InfoItem label="SMP" value={`${profilData.smp || "-"} (Lulus: ${profilData.smpTahunLulus || "-"})`} />
              <InfoItem label="SMA" value={`${profilData.sma || "-"} (Lulus: ${profilData.smaTahunLulus || "-"})`} />
              <InfoItem label="Perguruan Tinggi" value={`${profilData.pt || "-"} (Lulus: ${profilData.ptTahunLulus?.trim() || "-"})`} />
            </SectionCard>
          </div>
          <div className="col-md-6">
            <SectionCard title="Informasi Lainnya" icon="bi-info-circle">
              <InfoItem label="Kursus" value={profilData.kursus} />
              <InfoItem label="Hobby" value={profilData.hobby} />
              <InfoItem label="Pengalaman Kerja" value={profilData.pengalamanKerja} />
              <InfoItem label="Organisasi" value={profilData.organisasi} />
              <InfoItem label="Astra Grup" value={profilData.astraGrup} />
              {profilData.astraGrup === "Ya" && (
                <>
                  <InfoItem label="Hubungan Astra" value={profilData.astraHubungan} />
                  <InfoItem label="Perusahaan Astra" value={profilData.astraPerusahaan} />
                </>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'orangtua' && (
        <div className="row">
          <div className="col-md-4">
            <SectionCard title="Data Ayah" icon="bi-person">
              <InfoItem label="Nama" value={profilData.namaAyah} />
              <InfoItem label="NIK" value={profilData.nikAyah?.trim()} />
              <InfoItem label="Status" value={profilData.statusAyah} />
              <InfoItem label="Agama" value={profilData.agamaAyah} />
              <InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraanAyah} />
              <InfoItem label="Pendidikan" value={profilData.pendidikanAyah} />
              <InfoItem label="Pekerjaan" value={profilData.pekerjaanAyah} />
              <InfoItem label="Perusahaan" value={profilData.perusahaanAyah} />
              <InfoItem label="Penghasilan" value={profilData.penghasilanAyah} />
              <InfoItem label="No. HP" value={profilData.hpAyah} />
              <InfoItem label="Alamat" value={profilData.alamatAyah} />
            </SectionCard>
          </div>
          <div className="col-md-4">
            <SectionCard title="Data Ibu" icon="bi-person">
              <InfoItem label="Nama" value={profilData.namaIbu} />
              <InfoItem label="NIK" value={profilData.nikIbu?.trim()} />
              <InfoItem label="Status" value={profilData.statusIbu} />
              <InfoItem label="Agama" value={profilData.agamaIbu} />
              <InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraanIbu} />
              <InfoItem label="Pendidikan" value={profilData.pendidikanIbu} />
              <InfoItem label="Pekerjaan" value={profilData.pekerjaanIbu} />
              <InfoItem label="Perusahaan" value={profilData.perusahaanIbu} />
              <InfoItem label="Penghasilan" value={profilData.penghasilanIbu} />
              <InfoItem label="No. HP" value={profilData.hpIbu} />
              <InfoItem label="Alamat" value={profilData.alamatIbu} />
            </SectionCard>
          </div>
          <div className="col-md-4">
            <SectionCard title="Data Wali" icon="bi-person">
              <InfoItem label="Nama" value={profilData.namaWali} />
              <InfoItem label="NIK" value={profilData.nikWali?.trim()} />
              <InfoItem label="Status" value={profilData.statusWali?.trim()} />
              <InfoItem label="Agama" value={profilData.agamaWali} />
              <InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraanWali} />
              <InfoItem label="Pendidikan" value={profilData.pendidikanWali} />
              <InfoItem label="Pekerjaan" value={profilData.pekerjaanWali} />
              <InfoItem label="Perusahaan" value={profilData.perusahaanWali} />
              <InfoItem label="Penghasilan" value={profilData.penghasilanWali} />
              <InfoItem label="No. HP" value={profilData.hpWali} />
              <InfoItem label="Alamat" value={profilData.alamatWali} />
            </SectionCard>
            <SectionCard title="Saudara" icon="bi-people">
              <div className="row">
                <div className="col-6"><InfoItem label="Jumlah Saudara" value={profilData.jumlahSaudara} /></div>
                <div className="col-6"><InfoItem label="Jumlah Kakak" value={profilData.jumlahKakak} /></div>
                <div className="col-6"><InfoItem label="Jumlah Adik" value={profilData.jumlahAdik} /></div>
                <div className="col-6"><InfoItem label="Saudara Sekolah" value={profilData.saudaraSekolah} /></div>
                <div className="col-6"><InfoItem label="Saudara Bekerja" value={profilData.saudaraBekerja} /></div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </MainContent>
  );
}
