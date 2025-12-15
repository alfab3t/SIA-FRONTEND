"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { decryptIdUrl } from "@/lib/encryptor";
import { getUserData } from "@/context/user";

export default function DetailCutiAkademikPage() {
  const router = useRouter();
  const params = useParams();
  const userData = useMemo(() => getUserData(), []);

  // ============================
  // DECRYPT ID
  // ============================
  const realId = useMemo(() => {
    try {
      return decryptIdUrl(params?.id || "");
    } catch {
      return "";
    }
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  // ============================
  // LOAD DETAIL DATA
  // ============================
  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);

      if (!realId) {
        Toast.error("ID tidak valid.");
        router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik");
        return;
      }

      const url = `${API_LINK}CutiAkademik/detail?id=${encodeURIComponent(realId)}`;


      console.log("DETAIL URL =", url);

      const res = await fetch(url);
      const raw = await res.text();
      console.log("RAW DETAIL =", raw);

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        Toast.error("Server mengirim response tidak valid.");
        return;
      }

      if (!data?.id) {
        Toast.error("Data tidak ditemukan.");
        return;
      }

      setDetail(data);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [realId, router]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleBack = () =>
    router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik");

  // ============================
  // DOWNLOAD FILE (FIX)
  // ============================
  const handleDownload = (fileName) => {
  if (!fileName) {
    Toast.error("File tidak ditemukan.");
    return;
  }

  const downloadUrl = `${API_LINK}CutiAkademik/file/${fileName}`;
  console.log("DOWNLOAD URL =", downloadUrl);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
};


  if (loading) {
    return (
      <MainContent title="Detail Cuti Akademik" layout="Admin">
        <p>Loading...</p>
      </MainContent>
    );
  }

  if (!detail) {
    return (
      <MainContent title="Detail Cuti Akademik" layout="Admin">
        <p>Data tidak tersedia.</p>
      </MainContent>
    );
  }

  return (
    <MainContent
      title="Detail Cuti Akademik"
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: "Detail Pengajuan" },
      ]}
    >
      <div className="card p-4">

        {/* ============================== */}
        {/* INFORMASI CUTI AKADEMIK        */}
        {/* ============================== */}

        <h4 className="fw-bold">Informasi Pengajuan</h4>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Nomor Cuti</label>
            <p>{detail?.id || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tanggal Pengajuan</label>
            <p>{detail?.tglPengajuan || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Tahun Akademik</label>
            <p>{detail?.tahunAjaran || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Semester</label>
            <p>{detail?.semester || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Status</label>
            <p>{detail?.status || "-"}</p>
          </div>
        </div>

        <br />

        {/* ============================== */}
        {/* DATA MAHASISWA                */}
        {/* ============================== */}

        <h4 className="fw-bold">Data Mahasiswa</h4>
        <hr />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">NIM</label>
            <p>{detail?.mhsId || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Nama Mahasiswa</label>
            <p>{detail?.mahasiswa || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Program Studi</label>
            <p>{detail?.prodiNama || "-"}</p>
          </div>

          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Konsentrasi</label>
            <p>{detail?.konsentrasi || "-"}</p>
          </div>
        </div>

        <br />

        {/* ============================== */}
        {/* DOWNLOAD FILE                 */}
        {/* ============================== */}

        <h4 className="fw-bold">Lampiran</h4>
        <hr />

        <div className="row">

          {/* Surat Pernyataan */}
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Surat Pernyataan</label>
            <div>
              {detail?.lampiranSP ? (
                <Button
                  classType="primary"
                  label="📄 Download Surat Pernyataan"
                  onClick={() => handleDownload(detail.lampiranSP)}
                />
              ) : (
                <span>Tidak ada file</span>
              )}
            </div>
          </div>

          {/* Lampiran */}
          <div className="col-lg-6 mb-3">
            <label className="form-label fw-semibold">Lampiran</label>
            <div>
              {detail?.lampiran ? (
                <Button
                  classType="primary"
                  label="📎 Download Lampiran"
                  onClick={() => handleDownload(detail.lampiran)}
                />
              ) : (
                <span>Tidak ada file</span>
              )}
            </div>
          </div>

        </div>

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