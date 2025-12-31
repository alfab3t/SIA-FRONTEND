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
      router.push("/pages/Page_Administrasi_Pengajuan_Drop_Out");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/pages/Page_Administrasi_Pengajuan_Drop_Out");
  };

  const handleEdit = () => {
    router.push(`/pages/Page_Administrasi_Pengajuan_Drop_Out/edit/${params.id}`);
  };

  if (loading) return null;

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Detail Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out", href: "/pages/Page_Administrasi_Pengajuan_Drop_Out" },
        { label: "Detail" }
      ]}
    >
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Detail Pengajuan Drop Out
                </h5>
                <div>
                  {(data?.status === "Draft" || data?.dro_status === "Draft") && (
                    <button 
                      className="btn btn-warning btn-sm me-2"
                      onClick={handleEdit}
                    >
                      <i className="bi bi-pencil-square me-1"></i>
                      Edit
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleBack}
                  >
                    <i className="bi bi-arrow-left me-1"></i>
                    Kembali
                  </button>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {data && (
                <div className="row">
                  <div className="col-md-6">
                    <table className="table table-borderless">
                      <tbody>
                        <tr>
                          <td width="40%" className="fw-bold">No. Pengajuan DO</td>
                          <td width="5%">:</td>
                          <td>{data.id || data.dro_id || "-"}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Dibuat Oleh</td>
                          <td>:</td>
                          <td>{data.createdBy || "-"}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Status</td>
                          <td>:</td>
                          <td>
                            <span className={`badge ${
                              (data.status || data.dro_status) === "Draft" ? "bg-secondary" :
                              (data.status || data.dro_status) === "Disetujui" ? "bg-success" :
                              (data.status || data.dro_status) === "Ditolak" ? "bg-danger" :
                              "bg-warning"
                            }`}>
                              {data.status || data.dro_status || "-"}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold">No. SK DO</td>
                          <td>:</td>
                          <td>{data.sk || data.suratKeteranganNo || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="col-md-6">
                    <table className="table table-borderless">
                      <tbody>
                        <tr>
                          <td width="40%" className="fw-bold">Nama Mahasiswa</td>
                          <td width="5%">:</td>
                          <td>{data.mhsText || data.mhstext || "-"}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Program Studi</td>
                          <td>:</td>
                          <td>{data.prodi || "-"}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Konsentrasi</td>
                          <td>:</td>
                          <td>{data.konsentrasi || data.konsentrasi2 || "-"}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Angkatan</td>
                          <td>:</td>
                          <td>{data.angkatan || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!data && (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Data tidak ditemukan atau sedang dimuat...
                </div>
              )}

              {/* Approval Information */}
              {data && (data.approveWadir1By || data.approveDirBy) && (
                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="fw-bold mb-3">Informasi Persetujuan:</h6>
                    <div className="row">
                      {data.approveWadir1By && (
                        <div className="col-md-6">
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td width="40%" className="fw-bold">Disetujui Wadir 1</td>
                                <td width="5%">:</td>
                                <td>{data.approveWadir1By}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold">Tanggal Persetujuan</td>
                                <td>:</td>
                                <td>{data.approveWadir1Date || "-"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      {data.approveDirBy && (
                        <div className="col-md-6">
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td width="40%" className="fw-bold">Disetujui Direktur</td>
                                <td width="5%">:</td>
                                <td>{data.approveDirBy}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold">Tanggal Persetujuan</td>
                                <td>:</td>
                                <td>{data.approveDirDate || "-"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {(data?.alasanTolak) && (
                <div className="mt-4">
                  <h6 className="fw-bold mb-3">Alasan Penolakan:</h6>
                  <div className="alert alert-danger">
                    {data.alasanTolak}
                  </div>
                </div>
              )}

              {/* Menimbang Section */}
              {(data?.menimbang) && (
                <div className="mt-4">
                  <h6 className="fw-bold mb-3">Menimbang:</h6>
                  <div 
                    className="border rounded p-3 bg-light"
                    dangerouslySetInnerHTML={{ __html: data.menimbang }}
                  />
                </div>
              )}

              {/* Mengingat Section */}
              {(data?.mengingat) && (
                <div className="mt-4">
                  <h6 className="fw-bold mb-3">Mengingat:</h6>
                  <div 
                    className="border rounded p-3 bg-light"
                    dangerouslySetInnerHTML={{ __html: data.mengingat }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainContent>
  );
}