"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { decryptIdUrl } from "@/lib/encryptor";
import { getUserData } from "@/context/user";

export default function ProfilMahasiswaPage() {
  const router = useRouter();
  const params = useParams();
  const userData = useMemo(() => getUserData(), []);

  // ============================
  // DECRYPT ID
  // ============================
  const realMhsId = useMemo(() => {
    try {
      return decryptIdUrl(params?.mhsId || "");
    } catch {
      return params?.mhsId || "";
    }
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // ============================
  // LOAD PROFILE DATA
  // ============================
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      if (!realMhsId) {
        Toast.error("ID Mahasiswa tidak valid.");
        router.back();
        return;
      }

      // Use GetProfil endpoint with nim parameter
      const url = `${API_LINK}Mahasiswa/GetProfil?nim=${encodeURIComponent(realMhsId)}`;
      console.log("PROFILE URL =", url);

      // Add minimum loading time for better UX (300ms)
      const [response] = await Promise.all([
        fetch(url),
        new Promise(resolve => setTimeout(resolve, 300))
      ]);

      const raw = await response.text();
      console.log("RAW PROFILE =", raw);

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        Toast.error("Server mengirim response tidak valid.");
        return;
      }

      if (!data?.mhsNama) {
        Toast.error("Data mahasiswa tidak ditemukan.");
        return;
      }

      setProfile(data);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [realMhsId, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleBack = () => router.back();

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString || dateString === "1900-01-01") return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatGender = (gender) => {
    if (gender === "L") return "Laki-laki";
    if (gender === "P") return "Perempuan";
    return gender || "-";
  };

  if (loading) {
    return (
      <MainContent 
        title="Profil Mahasiswa" 
        layout="Admin"
        loading={loading}
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Profil Mahasiswa" },
        ]}
      >
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat profil mahasiswa...</p>
        </div>
      </MainContent>
    );
  }

  if (!profile) {
    return (
      <MainContent 
        title="Profil Mahasiswa" 
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Profil Mahasiswa" },
        ]}
      >
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="fas fa-user-times fa-3x text-muted"></i>
          </div>
          <h5 className="text-muted">Profil tidak ditemukan</h5>
          <p className="text-muted">Data mahasiswa tidak dapat ditemukan.</p>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent
      title="Profil Mahasiswa"
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Profil Mahasiswa" },
      ]}
    >
      <div className="card p-4">

        {/* ============================== */}
        {/* INFORMASI PRIBADI              */}
        {/* ============================== */}

        <div className="d-flex align-items-center mb-4">
          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
               style={{ width: '60px', height: '60px' }}>
            <i className="fas fa-user fa-2x text-white"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-1">{profile.mhsNama}</h4>
            <p className="text-muted mb-0">NIM: {profile.mhsId || realMhsId}</p>
          </div>
        </div>

        <h5 className="fw-bold">Informasi Pribadi</h5>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Nama Lengkap</label>
            <p>{profile.mhsNama || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Program Studi</label>
            <p>{profile.prodi || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tempat, Tanggal Lahir</label>
            <p>{profile.ttl || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jenis Kelamin</label>
            <p>{profile.mhsJenisKelamin || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">NISN</label>
            <p>{profile.dulNisn || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">NIK</label>
            <p>{profile.dulNik?.trim() || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Agama</label>
            <p>{profile.dulAgama || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kewarganegaraan</label>
            <p>{profile.dulKewarganegaraan || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Golongan Darah</label>
            <p>{profile.dulGolonganDarah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">No. HP</label>
            <p>{profile.dulHp || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Email</label>
            <p>{profile.dulEmail || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat</label>
            <p>{profile.dulAlamat || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kode Pos</label>
            <p>{profile.dulKodepos || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Status Kawin</label>
            <p>{profile.dulStatusKawin || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tinggi Badan</label>
            <p>{profile.dulTinggiBadan ? `${profile.dulTinggiBadan} cm` : "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Berat Badan</label>
            <p>{profile.dulBeratBadan ? `${profile.dulBeratBadan} kg` : "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Ukuran Sepatu</label>
            <p>{profile.dulUkuranSepatu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Ukuran Kemeja</label>
            <p>{profile.dulUkuranKemeja || "-"}</p>
          </div>
        </div>

        <br />

        {/* ============================== */}
        {/* INFORMASI AKADEMIK             */}
        {/* ============================== */}

        <h5 className="fw-bold">Informasi Akademik</h5>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Periode Awal</label>
            <p>{profile.awal || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Status Kuliah</label>
            <p>
              <span className={`badge ${profile.mhsStatusKuliah === 'Aktif' ? 'bg-success' : 'bg-secondary'}`}>
                {profile.mhsStatusKuliah || "-"}
              </span>
            </p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jalur Masuk</label>
            <p>{profile.dulJalur || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Status Beasiswa</label>
            <p>{profile.statusBeasiswa || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Dosen Akademik</label>
            <p>{profile.mhsDosenAkademik || "-"}</p>
          </div>
        </div>

        <br />

        {/* ============================== */}
        {/* INFORMASI PENDIDIKAN           */}
        {/* ============================== */}

        <h5 className="fw-bold">Riwayat Pendidikan</h5>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">SD</label>
            <p>{profile.dulSd || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tahun Lulus SD</label>
            <p>{profile.dulSdTahunLulus || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">SMP</label>
            <p>{profile.dulSmp || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tahun Lulus SMP</label>
            <p>{profile.dulSmpTahunLulus || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">SMA/SMK</label>
            <p>{profile.dulSma || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tahun Lulus SMA/SMK</label>
            <p>{profile.dulSmaTahunLulus || "-"}</p>
          </div>

          {profile.dulPt && profile.dulPt !== "-" && (
            <>
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Perguruan Tinggi</label>
                <p>{profile.dulPt}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Tahun Lulus PT</label>
                <p>{profile.dulPtTahunLulus || "-"}</p>
              </div>
            </>
          )}
        </div>

        <br />

        {/* ============================== */}
        {/* INFORMASI KELUARGA             */}
        {/* ============================== */}

        <h5 className="fw-bold">Informasi Keluarga</h5>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jumlah Saudara</label>
            <p>{profile.dulJumlahSaudara || "0"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jumlah Kakak</label>
            <p>{profile.dulJumlahKakak || "0"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jumlah Adik</label>
            <p>{profile.dulJumlahAdik || "0"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Saudara yang Sekolah</label>
            <p>{profile.dulSaudaraSekolah || "0"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Saudara yang Bekerja</label>
            <p>{profile.dulSaudaraBekerja || "0"}</p>
          </div>
        </div>

        <br />

        {/* ============================== */}
        {/* INFORMASI ORANG TUA/WALI       */}
        {/* ============================== */}

        <h5 className="fw-bold">Informasi Orang Tua/Wali</h5>
        <hr />

        <div className="row">
          {/* Data Ayah */}
          <div className="col-lg-12 mb-3">
            <h6 className="fw-semibold text-primary">Data Ayah</h6>
          </div>
          
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Nama Ayah</label>
            <p>{profile.dulNamaAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">NIK Ayah</label>
            <p>{profile.dulNikAyah?.trim() || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Status Ayah</label>
            <p>{profile.dulStatusAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kewarganegaraan Ayah</label>
            <p>{profile.dulKewarganegaraanAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Agama Ayah</label>
            <p>{profile.dulAgamaAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">No. HP Ayah</label>
            <p>{profile.dulHpAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Pendidikan Ayah</label>
            <p>{profile.dulPendidikanAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Pekerjaan Ayah</label>
            <p>{profile.dulPekerjaanAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Perusahaan Ayah</label>
            <p>{profile.dulPerusahaanAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Penghasilan Ayah</label>
            <p>{profile.dulPenghasilanAyah || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat Ayah</label>
            <p>{profile.dulAlamatAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kode Pos Ayah</label>
            <p>{profile.dulKodeposAyah || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat Perusahaan Ayah</label>
            <p>{profile.dulAlamatPerusahaanAyah || "-"}</p>
          </div>

          {/* Data Ibu */}
          <div className="col-lg-12 mb-3 mt-3">
            <h6 className="fw-semibold text-primary">Data Ibu</h6>
          </div>
          
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Nama Ibu</label>
            <p>{profile.dulNamaIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">NIK Ibu</label>
            <p>{profile.dulNikIbu?.trim() || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Status Ibu</label>
            <p>{profile.dulStatusIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kewarganegaraan Ibu</label>
            <p>{profile.dulKewarganegaraanIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Agama Ibu</label>
            <p>{profile.dulAgamaIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">No. HP Ibu</label>
            <p>{profile.dulHpIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Pendidikan Ibu</label>
            <p>{profile.dulPendidikanIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Pekerjaan Ibu</label>
            <p>{profile.dulPekerjaanIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Perusahaan Ibu</label>
            <p>{profile.dulPerusahaanIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Penghasilan Ibu</label>
            <p>{profile.dulPenghasilanIbu || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat Ibu</label>
            <p>{profile.dulAlamatIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kode Pos Ibu</label>
            <p>{profile.dulKodeposIbu || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat Perusahaan Ibu</label>
            <p>{profile.dulAlamatPerusahaanIbu || "-"}</p>
          </div>

          {/* Data Wali */}
          {(profile.dulNamaWali && profile.dulNamaWali !== "-") && (
            <>
              <div className="col-lg-12 mb-3 mt-3">
                <h6 className="fw-semibold text-primary">Data Wali</h6>
              </div>
              
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Nama Wali</label>
                <p>{profile.dulNamaWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">NIK Wali</label>
                <p>{profile.dulNikWali?.trim() || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Status Wali</label>
                <p>{profile.dulStatusWali?.trim() || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Kewarganegaraan Wali</label>
                <p>{profile.dulKewarganegaraanWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Agama Wali</label>
                <p>{profile.dulAgamaWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">No. HP Wali</label>
                <p>{profile.dulHpWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Pendidikan Wali</label>
                <p>{profile.dulPendidikanWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Pekerjaan Wali</label>
                <p>{profile.dulPekerjaanWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Perusahaan Wali</label>
                <p>{profile.dulPerusahaanWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Penghasilan Wali</label>
                <p>{profile.dulPenghasilanWali || "-"}</p>
              </div>

              <div className="col-lg-12 mb-3">
                <label className="form-label fw-semibold">Alamat Wali</label>
                <p>{profile.dulAlamatWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Kode Pos Wali</label>
                <p>{profile.dulKodeposWali || "-"}</p>
              </div>

              <div className="col-lg-12 mb-3">
                <label className="form-label fw-semibold">Alamat Perusahaan Wali</label>
                <p>{profile.dulAlamatPerusahaanWali || "-"}</p>
              </div>
            </>
          )}
        </div>

        <br />

        {/* ============================== */}
        {/* INFORMASI REKENING             */}
        {/* ============================== */}

        {(profile.atasNama || profile.noRek || profile.namaBank) && (
          <>
            <h5 className="fw-bold">Informasi Rekening</h5>
            <hr />

            <div className="row">
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Atas Nama</label>
                <p>{profile.atasNama || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Nomor Rekening</label>
                <p>{profile.noRek || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Nama Bank</label>
                <p>{profile.namaBank || "-"}</p>
              </div>
            </div>
          </>
        )}

        <div className="d-flex justify-content-end mt-4">
          <Button
            classType="secondary"
            label="Kembali"
            onClick={handleBack}
          />
        </div>

      </div>
    </MainContent>
  );
}