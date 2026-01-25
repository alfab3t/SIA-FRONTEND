"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PropTypes from "prop-types";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Loading from "@/components/common/Loading";
import Toast from "@/components/common/Toast";
import { Avatar } from "@/components/common/Img";
import { API_LINK } from "@/lib/constant";
import { decryptIdUrl } from "@/lib/encryptor";

// InfoItem component moved outside parent component
const InfoItem = ({ label, value }) => (
  <div className="mb-3">
    <small className="text-muted d-block">{label}</small>
    <span>{value || "-"}</span>
  </div>
);

InfoItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default function DetailMahasiswa() {
  const params = useParams();
  const router = useRouter();
  const encryptedId = params.id;
  const mhsId = decryptIdUrl(encryptedId);
  
  const [profilData, setProfilData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dataDiri');

  useEffect(() => {
    if (mhsId) {
      loadAllData(mhsId);
    } else {
      Toast.error("ID Mahasiswa tidak valid");
      setIsLoading(false);
    }
  }, [mhsId]);

  const loadAllData = async (mahasiswaId) => {
    try {
      await loadProfilMahasiswa(mahasiswaId);
    } catch (err) {
      console.error("Error loading all data:", err);
      Toast.error("Gagal memuat data mahasiswa");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfilMahasiswa = async (mahasiswaId) => {
    try {
      const res = await fetch(`${API_LINK}DropOut/mahasiswa/${mahasiswaId}/profil`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setProfilData(data);
      }
    } catch (err) {
      console.error("Error loading profil:", err);
    }
  };

  if (isLoading) {
    return (
      <MainContent layout="Admin" title="Detail Mahasiswa" breadcrumb={[
        { label: "Beranda", link: "/" },
        { label: "Master" },
        { label: "Mahasiswa", link: "/pages/persiapan-perkuliahan/mahasiswa" },
        { label: "Detail" }
      ]}>
        <Loading loading={true} message="Memuat data mahasiswa..." />
      </MainContent>
    );
  }

  if (!profilData) {
    return (
      <MainContent layout="Admin" title="Detail Mahasiswa" breadcrumb={[
        { label: "Beranda", link: "/" },
        { label: "Master" },
        { label: "Mahasiswa", link: "/pages/persiapan-perkuliahan/mahasiswa" },
        { label: "Detail" }
      ]}>
        <Card title="Detail Mahasiswa">
          <div className="text-center py-5">
            <i className="bi bi-person-x fs-1 text-muted"></i>
            <h5 className="mt-3 text-muted">Data profil tidak ditemukan</h5>
          </div>
        </Card>
      </MainContent>
    );
  }

  const tabs = [
    { key: 'dataDiri', label: 'Data Diri' },
  ];

  return (
    <MainContent layout="Admin" title="Detail Mahasiswa" breadcrumb={[
      { label: "Beranda", link: "/" },
      { label: "Master" },
      { label: "Mahasiswa", link: "/pages/persiapan-perkuliahan/mahasiswa" },
      { label: "Detail" }
    ]}>
      <Card title="Profil Mahasiswa">
        <div className="row align-items-center">
          <div className="col-auto">
            <Avatar name={profilData.mhsNama || "M"} size={80} />
          </div>
          <div className="col">
            <div className="row">
              <div className="col-md-6">
                <InfoItem label="Nama" value={profilData.mhsNama} />
                <InfoItem label="Program Studi" value={profilData.prodi} />
                <InfoItem label="Jalur Masuk" value={profilData.jalurMasuk} />
                <div className="col-md-4">
                  <InfoItem label="Status Mahasiswa" value={profilData.statusKuliah} />
                </div>
              </div>
              <div className="col-md-6">
                <InfoItem label="Nomor Induk Mahasiswa (NIM)" value={profilData.mhsId || mhsId} />
                <InfoItem label="Semester Awal" value={profilData.angkatan} />
                <InfoItem label="Status Beasiswa" value={profilData.statusBeasiswa} />
                <InfoItem label="Wali Mahasiswa" value={profilData.dosenWali} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ul className="nav nav-tabs mt-4">
        {tabs.map(tab => (
          <li className="nav-item" key={tab.key}>
            <button 
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`} 
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tab-content mt-3">
        {activeTab === 'dataDiri' && (
          <>
            <Card title="Data Mahasiswa" className="mb-4">
              <div className="row">
                <div className="col-md-4"><InfoItem label="Nama" value={profilData.mhsNama} /></div>
                <div className="col-md-4"><InfoItem label="NIK" value={profilData.nik} /></div>
                <div className="col-md-4"><InfoItem label="Tempat & Tanggal Lahir" value={profilData.ttl} /></div>
                <div className="col-md-4"><InfoItem label="Jenis Kelamin" value={profilData.jenisKelamin} /></div>
                <div className="col-md-4"><InfoItem label="Agama" value={profilData.agama} /></div>
                <div className="col-md-4"><InfoItem label="Golongan Darah" value={profilData.golonganDarah} /></div>
                <div className="col-md-4"><InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraan} /></div>
                <div className="col-md-4"><InfoItem label="Alamat" value={profilData.alamat} /></div>
                <div className="col-md-4"><InfoItem label="Kode Pos" value={profilData.kodepos} /></div>
                <div className="col-md-4"><InfoItem label="SD" value={profilData.sd} /></div>
                <div className="col-md-4"><InfoItem label="Tahun Lulus SD" value={profilData.sdTahunLulus} /></div>
                <div className="col-md-4"><InfoItem label="SMP" value={profilData.smp} /></div>
                <div className="col-md-4"><InfoItem label="Tahun Lulus SMP" value={profilData.smpTahunLulus} /></div>
                <div className="col-md-4"><InfoItem label="SMA" value={profilData.sma} /></div>
                <div className="col-md-4"><InfoItem label="Tahun Lulus SMA" value={profilData.smaTahunLulus} /></div>
                <div className="col-md-4"><InfoItem label="Perguruan Tinggi" value={profilData.pt} /></div>
                <div className="col-md-4"><InfoItem label="Tahun Lulus PT" value={profilData.ptTahunLulus} /></div>
                <div className="col-md-4"><InfoItem label="Kursus" value={profilData.kursus} /></div>
                <div className="col-md-4"><InfoItem label="Hobi" value={profilData.hobby} /></div>
                <div className="col-md-4"><InfoItem label="Pengalaman Kerja" value={profilData.pengalamanKerja} /></div>
                <div className="col-md-4"><InfoItem label="Organisasi" value={profilData.organisasi} /></div>
                <div className="col-md-4"><InfoItem label="Status Kawin" value={profilData.statusKawin} /></div>
                <div className="col-md-4"><InfoItem label="Ukuran Sepatu" value={profilData.ukuranSepatu} /></div>
                <div className="col-md-4"><InfoItem label="Ukuran Kemeja" value={profilData.ukuranKemeja} /></div>
                <div className="col-md-4"><InfoItem label="Tinggi Badan" value={profilData.tinggiBadan ? `${profilData.tinggiBadan} cm` : null} /></div>
                <div className="col-md-4"><InfoItem label="Berat Badan" value={profilData.beratBadan ? `${profilData.beratBadan} kg` : null} /></div>
                <div className="col-md-4"><InfoItem label="Jumlah Saudara" value={profilData.jumlahSaudara} /></div>
              </div>
            </Card>

            <Card className="mb-4">
              <div className="row">
                <div className="col-md-4"><InfoItem label="Jumlah Kakak" value={profilData.jumlahKakak} /></div>
                <div className="col-md-4"><InfoItem label="Jumlah Adik" value={profilData.jumlahAdik} /></div>
                <div className="col-md-4"><InfoItem label="Jumlah Saudara Sekolah" value={profilData.saudaraSekolah} /></div>
                <div className="col-md-4"><InfoItem label="Jumlah Saudara Bekerja" value={profilData.saudaraBekerja} /></div>
                <div className="col-md-4"><InfoItem label="Ada Saudara di Astra?" value={profilData.astraGrup} /></div>
                <div className="col-md-4"><InfoItem label="Hubungan Saudara Astra" value={profilData.astraHubungan} /></div>
                <div className="col-md-4"><InfoItem label="Perusahaan Astra Grup" value={profilData.astraPerusahaan} /></div>
                <div className="col-md-4"><InfoItem label="No. Handphone" value={profilData.hp} /></div>
                <div className="col-md-4"><InfoItem label="Email" value={profilData.email} /></div>
                <div className="col-md-4"><InfoItem label="Nomor Rekening" value={profilData.noRek} /></div>
                <div className="col-md-4"><InfoItem label="Atas Nama" value={profilData.atasNama} /></div>
                <div className="col-md-4"><InfoItem label="Nama Bank" value={profilData.namaBank} /></div>
                <div className="col-md-4"><InfoItem label="NISN" value={profilData.nisn} /></div>
              </div>
            </Card>

            <Card title="Data Orang Tua/Wali" className="mb-4">
              <h6 className="fw-bold mb-3">Data Ayah</h6>
              <div className="row mb-4">
                <div className="col-md-4"><InfoItem label="Nama Ayah" value={profilData.namaAyah} /></div>
                <div className="col-md-4"><InfoItem label="NIK Ayah" value={profilData.nikAyah} /></div>
                <div className="col-md-4"><InfoItem label="Status Ayah" value={profilData.statusAyah} /></div>
                <div className="col-md-4"><InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraanAyah} /></div>
                <div className="col-md-4"><InfoItem label="Agama" value={profilData.agamaAyah} /></div>
                <div className="col-md-4"><InfoItem label="Alamat" value={profilData.alamatAyah} /></div>
                <div className="col-md-4"><InfoItem label="Kode Pos" value={profilData.kodeposAyah} /></div>
                <div className="col-md-4"><InfoItem label="No. HP" value={profilData.hpAyah} /></div>
                <div className="col-md-4"><InfoItem label="Pendidikan" value={profilData.pendidikanAyah} /></div>
                <div className="col-md-4"><InfoItem label="Pekerjaan" value={profilData.pekerjaanAyah} /></div>
                <div className="col-md-4"><InfoItem label="Perusahaan" value={profilData.perusahaanAyah} /></div>
                <div className="col-md-4"><InfoItem label="Alamat Perusahaan" value={profilData.alamatPerusahaanAyah} /></div>
                <div className="col-md-4"><InfoItem label="Penghasilan" value={profilData.penghasilanAyah} /></div>
              </div>

              <h6 className="fw-bold mb-3">Data Ibu</h6>
              <div className="row mb-4">
                <div className="col-md-4"><InfoItem label="Nama Ibu" value={profilData.namaIbu} /></div>
                <div className="col-md-4"><InfoItem label="NIK Ibu" value={profilData.nikIbu} /></div>
                <div className="col-md-4"><InfoItem label="Status Ibu" value={profilData.statusIbu} /></div>
                <div className="col-md-4"><InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraanIbu} /></div>
                <div className="col-md-4"><InfoItem label="Agama" value={profilData.agamaIbu} /></div>
                <div className="col-md-4"><InfoItem label="Alamat" value={profilData.alamatIbu} /></div>
                <div className="col-md-4"><InfoItem label="Kode Pos" value={profilData.kodeposIbu} /></div>
                <div className="col-md-4"><InfoItem label="No. HP" value={profilData.hpIbu} /></div>
                <div className="col-md-4"><InfoItem label="Pendidikan" value={profilData.pendidikanIbu} /></div>
                <div className="col-md-4"><InfoItem label="Pekerjaan" value={profilData.pekerjaanIbu} /></div>
                <div className="col-md-4"><InfoItem label="Perusahaan" value={profilData.perusahaanIbu} /></div>
                <div className="col-md-4"><InfoItem label="Alamat Perusahaan" value={profilData.alamatPerusahaanIbu} /></div>
                <div className="col-md-4"><InfoItem label="Penghasilan" value={profilData.penghasilanIbu} /></div>
              </div>

              <h6 className="fw-bold mb-3">Data Wali</h6>
              <div className="row">
                <div className="col-md-4"><InfoItem label="Nama Wali" value={profilData.namaWali} /></div>
                <div className="col-md-4"><InfoItem label="NIK Wali" value={profilData.nikWali} /></div>
                <div className="col-md-4"><InfoItem label="Status Wali" value={profilData.statusWali} /></div>
                <div className="col-md-4"><InfoItem label="Kewarganegaraan" value={profilData.kewarganegaraanWali} /></div>
                <div className="col-md-4"><InfoItem label="Agama" value={profilData.agamaWali} /></div>
                <div className="col-md-4"><InfoItem label="Alamat" value={profilData.alamatWali} /></div>
                <div className="col-md-4"><InfoItem label="Kode Pos" value={profilData.kodeposWali} /></div>
                <div className="col-md-4"><InfoItem label="No. HP" value={profilData.hpWali} /></div>
                <div className="col-md-4"><InfoItem label="Pendidikan" value={profilData.pendidikanWali} /></div>
                <div className="col-md-4"><InfoItem label="Pekerjaan" value={profilData.pekerjaanWali} /></div>
                <div className="col-md-4"><InfoItem label="Perusahaan" value={profilData.perusahaanWali} /></div>
                <div className="col-md-4"><InfoItem label="Alamat Perusahaan" value={profilData.alamatPerusahaanWali} /></div>
                <div className="col-md-4"><InfoItem label="Penghasilan" value={profilData.penghasilanWali} /></div>
              </div>
            </Card>

            <Card title="Data Kegiatan/Prestasi" className="mb-4">
              <div className="text-center text-muted py-4">Tidak ada data kegiatan/prestasi</div>
            </Card>
          </>
        )}
      </div>

      <div className="mt-4">
        <button className="btn btn-primary" onClick={() => router.back()}>
          <i className="bi bi-arrow-left me-2"></i>Kembali
        </button>
      </div>
    </MainContent>
  );
}
