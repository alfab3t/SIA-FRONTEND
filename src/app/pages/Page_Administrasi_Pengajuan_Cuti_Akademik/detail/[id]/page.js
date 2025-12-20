"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { decryptIdUrl } from "@/lib/encryptor";
import { getUserData } from "@/context/user";
import { formatDate } from "@/lib/dateFormater";

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

  // ============================
  // HELPER FUNCTIONS
  // ============================
  const getStatusBadge = (status) => {
    const statusMap = {
      'Menunggu Persetujuan': { class: 'warning', text: 'Menunggu Persetujuan' },
      'Disetujui Prodi': { class: 'info', text: 'Disetujui Prodi' },
      'Disetujui': { class: 'success', text: 'Disetujui' },
      'Ditolak': { class: 'danger', text: 'Ditolak' },
      'Dalam Proses': { class: 'primary', text: 'Dalam Proses' }
    };
    
    const statusInfo = statusMap[status] || { class: 'secondary', text: status || 'Tidak Diketahui' };
    return (
      <span className={`badge bg-${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const canViewApprovalStatus = () => {
    const userRole = userData?.role?.toLowerCase();
    return ['nda+prodi', 'user_finance', 'admin'].includes(userRole);
  };

  const formatTanggalPengajuan = (tanggal) => {
    if (!tanggal) {
      return formatDate(new Date());
    }
    return tanggal;
  };

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
            <p>{formatTanggalPengajuan(detail?.tglPengajuan)}</p>
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
            <div>{getStatusBadge(detail?.status)}</div>
          </div>

          {/* Tambahan field persetujuan di bagian status utama */}
          {detail?.approvalProdi && (
            <div className="col-lg-6 mb-3">
              <label className="form-label fw-semibold">Persetujuan Prodi Oleh</label>
              <p>{detail.approvalProdi}</p>
            </div>
          )}

          {detail?.approvalDir1 && (
            <div className="col-lg-6 mb-3">
              <label className="form-label fw-semibold">Persetujuan Wadir1 Oleh</label>
              <p>{detail.approvalDir1}</p>
            </div>
          )}
        </div>

        {/* Status Persetujuan - Hanya untuk role tertentu */}
        {canViewApprovalStatus() && (
          <>
            <br />
            <h5 className="fw-bold">Status Persetujuan</h5>
            <hr />
            <div className="row">
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Status Approval Prodi</label>
                <div>
                  {detail?.approvalProdi && detail?.appProdiDate ? (
                    <span className="badge bg-success">Disetujui</span>
                  ) : (
                    <span className="badge bg-warning">Menunggu Persetujuan</span>
                  )}
                </div>
              </div>
              
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Persetujuan Prodi Oleh</label>
                <p>{detail?.approvalProdi || "Belum disetujui"}</p>
              </div>
              
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Tanggal Persetujuan Prodi</label>
                <p>{detail?.appProdiDate || "Belum disetujui"}</p>
              </div>
              
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Status Approval Wakil Direktur</label>
                <div>
                  {detail?.approvalDir1 && detail?.appDir1Date ? (
                    <span className="badge bg-success">Disetujui</span>
                  ) : (
                    <span className="badge bg-warning">Menunggu Persetujuan</span>
                  )}
                </div>
              </div>
              
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Persetujuan Wakil Direktur Oleh</label>
                <p>{detail?.approvalDir1 || "Belum disetujui"}</p>
              </div>
              
              <div className="col-lg-6 mb-3">
                <label className="form-label fw-semibold">Tanggal Persetujuan Wakil Direktur</label>
                <p>{detail?.appDir1Date || "Belum disetujui"}</p>
              </div>
              
              {detail?.menimbang && (
                <div className="col-lg-12 mb-3">
                  <label className="form-label fw-semibold">Pertimbangan</label>
                  <div className="text-muted" dangerouslySetInnerHTML={{ __html: detail.menimbang }} />
                </div>
              )}
              
              {detail?.sk && (
                <div className="col-lg-12 mb-3">
                  <label className="form-label fw-semibold">Surat Keputusan</label>
                  <div>
                    <Button
                      classType="success"
                      label="📄 Download SK Cuti Akademik"
                      onClick={() => handleDownload(detail.sk)}
                    />
                    {detail?.srtNo && (
                      <p className="mt-2 mb-0 text-muted">
                        <small>Nomor: {detail.srtNo}</small>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

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