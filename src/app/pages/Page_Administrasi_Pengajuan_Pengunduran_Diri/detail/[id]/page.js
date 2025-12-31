"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";
import fetchData from "@/lib/fetch";

export default function DetailPengunduranDiri() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

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
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const id = decodeURIComponent(params.id);
      
      // Simulasi data detail
      const mockData = {
        id: "043/PMA/PD/XI/2025",
        pdId: "043/PMA/PD/XI/2025",
        nim: "0320220118",
        namaMahasiswa: "MUHAMMAD JILBRAN",
        prodi: "Manajemen Informatika",
        konsentrasi: "Programming & Mobile",
        angkatan: "2022",
        tanggalPengajuan: "12 Des 2025",
        tanggalPengunduran: "15 Des 2025",
        alasanPengunduran: "Mengundurkan diri karena alasan pribadi dan keluarga. Ingin fokus pada bisnis keluarga yang memerlukan perhatian penuh.",
        keterangan: "Mahasiswa telah menyelesaikan semester 6 dengan IPK 3.45",
        status: "Belum Disetujui Wadir 1",
        disetujuiProdi: true,
        disetujuiWadir1: false,
        tanggalSetujuProdi: "13 Des 2025",
        catatanProdi: "Disetujui dengan catatan mahasiswa sudah menyelesaikan kewajiban akademik",
        noSK: null,
        fileSK: null,
        createdBy: "admin_prodi",
        createdDate: "12 Des 2025 10:30:00",
        modifiedBy: "admin_prodi",
        modifiedDate: "13 Des 2025 14:15:00"
      };

      setData(mockData);
    } catch (err) {
      console.error("Load data error:", err);
      Toast.error("Gagal memuat data: " + err.message);
      router.push("/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const confirm = await SweetAlert({
      title: "Setujui Pengajuan",
      text: "Apakah Anda yakin ingin menyetujui pengajuan pengunduran diri ini?",
      icon: "info",
      confirmText: "Ya, Setujui!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      setProcessing(true);
      
      // Simulasi API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Toast.success("Pengajuan berhasil disetujui");
      router.push("/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri");
    } catch (err) {
      Toast.error("Gagal menyetujui pengajuan: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const confirm = await SweetAlert({
      title: "Tolak Pengajuan",
      text: "Apakah Anda yakin ingin menolak pengajuan pengunduran diri ini?",
      icon: "warning",
      confirmText: "Ya, Tolak!",
      confirmButtonColor: "#dc3545",
    });

    if (!confirm) return;

    try {
      setProcessing(true);
      
      // Simulasi API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Toast.success("Pengajuan berhasil ditolak");
      router.push("/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri");
    } catch (err) {
      Toast.error("Gagal menolak pengajuan: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = useMemo(() => {
    if (!userData?.role || !data) return false;
    const role = userData.role.toUpperCase();
    const status = data.status;

    if (status === "Belum Disetujui Prodi" && (role.includes("PRODI") || role === "NDA_PRODI")) {
      return true;
    }
    if (status === "Belum Disetujui Wadir 1" && role.includes("WADIR")) {
      return true;
    }
    return false;
  }, [userData, data]);

  const canEdit = useMemo(() => {
    if (!userData?.role || !data) return false;
    const role = userData.role.toUpperCase();
    const status = data.status;

    return (status === "Draft" || status === "DRAFT") && 
           (role.includes("PRODI") || role === "NDA_PRODI" || role.includes("ADMIN"));
  }, [userData, data]);

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
        { label: "Administrasi Akademik" },
        { label: "Pengunduran Diri", href: "/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri" },
        { label: "Detail Pengajuan" }
      ]}
    >
      <Card title="Detail Pengajuan Pengunduran Diri Mahasiswa">
        {/* Info Pengajuan */}
        <div className="row mb-4">
          <div className="col-md-6">
            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td width="40%" className="fw-bold">No. Pengajuan PD</td>
                  <td width="5%">:</td>
                  <td>{data?.pdId || "-"}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Tanggal Pengajuan</td>
                  <td>:</td>
                  <td>{data?.tanggalPengajuan || "-"}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Status</td>
                  <td>:</td>
                  <td>
                    <span className={`badge ${
                      data?.status === "Disetujui" ? "bg-success" :
                      data?.status === "Ditolak" ? "bg-danger" :
                      data?.status === "Draft" ? "bg-secondary" : "bg-warning"
                    }`}>
                      {data?.status || "-"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="col-md-6">
            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td width="40%" className="fw-bold">Disetujui Prodi</td>
                  <td width="5%">:</td>
                  <td>
                    {data?.disetujuiProdi ? (
                      <span className="text-success">✓ Ya</span>
                    ) : (
                      <span className="text-danger">✗ Belum</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">Disetujui Wadir 1</td>
                  <td>:</td>
                  <td>
                    {data?.disetujuiWadir1 ? (
                      <span className="text-success">✓ Ya</span>
                    ) : (
                      <span className="text-danger">✗ Belum</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">No. SK</td>
                  <td>:</td>
                  <td>{data?.noSK || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <hr />

        {/* Data Mahasiswa */}
        <h6 className="fw-bold text-primary mb-3">
          <i className="bi bi-person me-2"></i>
          Data Mahasiswa
        </h6>
        <div className="row mb-4">
          <div className="col-md-6">
            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td width="40%" className="fw-bold">NIM</td>
                  <td width="5%">:</td>
                  <td>{data?.nim || "-"}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Nama Mahasiswa</td>
                  <td>:</td>
                  <td>{data?.namaMahasiswa || "-"}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Program Studi</td>
                  <td>:</td>
                  <td>{data?.prodi || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="col-md-6">
            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td width="40%" className="fw-bold">Konsentrasi</td>
                  <td width="5%">:</td>
                  <td>{data?.konsentrasi || "-"}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Angkatan</td>
                  <td>:</td>
                  <td>{data?.angkatan || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <hr />

        {/* Data Pengunduran */}
        <h6 className="fw-bold text-primary mb-3">
          <i className="bi bi-file-text me-2"></i>
          Data Pengunduran Diri
        </h6>
        <div className="row mb-4">
          <div className="col-md-6">
            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td width="40%" className="fw-bold">Tanggal Pengunduran</td>
                  <td width="5%">:</td>
                  <td>{data?.tanggalPengunduran || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Alasan Pengunduran:</label>
          <div className="border rounded p-3 bg-light">
            {data?.alasanPengunduran || "-"}
          </div>
        </div>

        {data?.keterangan && (
          <div className="mb-3">
            <label className="form-label fw-bold">Keterangan Tambahan:</label>
            <div className="border rounded p-3 bg-light">
              {data.keterangan}
            </div>
          </div>
        )}

        {/* Riwayat Persetujuan */}
        {(data?.disetujuiProdi || data?.disetujuiWadir1) && (
          <>
            <hr />
            <h6 className="fw-bold text-primary mb-3">
              <i className="bi bi-clock-history me-2"></i>
              Riwayat Persetujuan
            </h6>
            
            {data?.disetujuiProdi && (
              <div className="mb-3">
                <div className="border rounded p-3 bg-success bg-opacity-10">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    <strong>Disetujui Prodi</strong>
                  </div>
                  <small className="text-muted">
                    Tanggal: {data.tanggalSetujuProdi}
                  </small>
                  {data?.catatanProdi && (
                    <div className="mt-2">
                      <strong>Catatan:</strong> {data.catatanProdi}
                    </div>
                  )}
                </div>
              </div>
            )}

            {data?.disetujuiWadir1 && (
              <div className="mb-3">
                <div className="border rounded p-3 bg-success bg-opacity-10">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    <strong>Disetujui Wadir 1</strong>
                  </div>
                  <small className="text-muted">
                    Tanggal: {data.tanggalSetujuWadir1}
                  </small>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-4 d-flex justify-content-end gap-2">
          <Button
            classType="secondary"
            label="Kembali"
            onClick={() => router.back()}
          />
          
          {canEdit && (
            <Button
              classType="warning"
              label="Edit"
              onClick={() => router.push(`/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri/edit/${encodeURIComponent(data.id)}`)}
              iconName="pencil"
            />
          )}

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
      </Card>
    </MainContent>
  );
}