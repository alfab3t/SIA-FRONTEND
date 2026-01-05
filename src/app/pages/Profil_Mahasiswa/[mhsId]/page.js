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

      const url = `${API_LINK}Mahasiswa/GetDetail?mhsId=${encodeURIComponent(realMhsId)}`;
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
            <p className="text-muted mb-0">NIM: {realMhsId}</p>
          </div>
        </div>

        <h5 className="fw-bold">Informasi Pribadi</h5>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">No. Pendaftaran</label>
            <p>{profile.dulNoPendaftaran || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Nama Lengkap</label>
            <p>{profile.mhsNama || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Program Studi</label>
            <p>{profile.konNama || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jenis Mahasiswa</label>
            <p>{profile.mhsJenis || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tempat Lahir</label>
            <p>{profile.mhsTempatLahir || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tanggal Lahir</label>
            <p>{formatDate(profile.mhsTglLahir)}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Jenis Kelamin</label>
            <p>{formatGender(profile.mhsJenisKelamin)}</p>
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
            <label className="form-label fw-semibold">No. HP</label>
            <p>{profile.mhsHp || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Email</label>
            <p>{profile.mhsEmail || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat</label>
            <p>{profile.mhsAlamat || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kode Pos</label>
            <p>{profile.mhsKodepos || "-"}</p>
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
            <label className="form-label fw-semibold">Angkatan</label>
            <p>{profile.mhsAngkatan || "-"}</p>
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
            <label className="form-label fw-semibold">Tanggal Masuk</label>
            <p>{formatDate(profile.mhsTglMasuk)}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tanggal Lulus</label>
            <p>{formatDate(profile.mhsTglLulus) || "Belum Lulus"}</p>
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
            <label className="form-label fw-semibold">Status Ayah</label>
            <p>{profile.dulStatusAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">No. HP Ayah</label>
            <p>{profile.dulHpAyah || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kode Pos Ayah</label>
            <p>{profile.dulKodeposAyah || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat Ayah</label>
            <p>{profile.dulAlamatAyah || "-"}</p>
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
            <label className="form-label fw-semibold">Status Ibu</label>
            <p>{profile.dulStatusIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">No. HP Ibu</label>
            <p>{profile.dulHpIbu || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Kode Pos Ibu</label>
            <p>{profile.dulKodeposIbu || "-"}</p>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="form-label fw-semibold">Alamat Ibu</label>
            <p>{profile.dulAlamatIbu || "-"}</p>
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
                <label className="form-label fw-semibold">Status Wali</label>
                <p>{profile.dulStatusWali?.trim() || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">No. HP Wali</label>
                <p>{profile.dulHpWali || "-"}</p>
              </div>

              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Kode Pos Wali</label>
                <p>{profile.dulKodeposWali || "-"}</p>
              </div>

              <div className="col-lg-12 mb-3">
                <label className="form-label fw-semibold">Alamat Wali</label>
                <p>{profile.dulAlamatWali || "-"}</p>
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