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

export default function UploadSKDropOut() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [noSK, setNoSK] = useState("");

  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    // Check if user is admin
    const role = userData?.role?.toUpperCase() || "";
    if (!role.includes("USER_ADMIN") && !role.includes("ADMIN")) {
      Toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push("/pages/Page_Administrasi_Pengajuan_Drop_Out");
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

      setData(response);
    } catch (err) {
      console.error("Load data error:", err);
      Toast.error("Gagal memuat data: " + err.message);
      router.push("/pages/Page_Administrasi_Pengajuan_Drop_Out");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        Toast.error("Format file tidak didukung. Gunakan PDF, JPG, atau PNG.");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Toast.error("Ukuran file maksimal 5MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!noSK.trim()) {
      Toast.error("Nomor SK wajib diisi");
      return;
    }
    if (!selectedFile) {
      Toast.error("File SK wajib diunggah");
      return;
    }

    const confirm = await SweetAlert({
      title: "Upload SK",
      text: "Apakah Anda yakin ingin mengupload SK ini?",
      icon: "info",
      confirmText: "Ya, Upload!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      setUploading(true);
      const id = decodeURIComponent(params.id);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("id", id);
      formData.append("noSK", noSK);
      formData.append("file", selectedFile);

      const res = await fetch(`${API_LINK}DropOut/upload-sk`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        Toast.error(result?.message || "Gagal mengupload SK");
        return;
      }

      Toast.success("SK berhasil diupload");
      router.push("/pages/Page_Administrasi_Pengajuan_Drop_Out");
    } catch (err) {
      console.error("Upload error:", err);
      Toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <MainContent layout="Admin" loading={true} title="Upload SK Drop Out">
        <div></div>
      </MainContent>
    );
  }

  return (
    <MainContent
      layout="Admin"
      title="Upload SK Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out", href: "/pages/Page_Administrasi_Pengajuan_Drop_Out" },
        { label: "Upload SK" }
      ]}
    >
      <Card title="Upload SK Drop Out">
        {/* Info Pengajuan */}
        <div className="row mb-4">
          <div className="col-md-6">
            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td width="40%" className="fw-bold">No. Pengajuan DO</td>
                  <td width="5%">:</td>
                  <td>{data?.id || "-"}</td>
                </tr>
                <tr>
                  <td className="fw-bold">Nama Mahasiswa</td>
                  <td>:</td>
                  <td>{data?.mhsText || "-"}</td>
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
                <tr>
                  <td className="fw-bold">Status</td>
                  <td>:</td>
                  <td>
                    <span className="badge bg-warning">{data?.status || "-"}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <hr />

        {/* Form Upload */}
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">
              Nomor SK <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Masukkan Nomor SK"
              value={noSK}
              onChange={(e) => setNoSK(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-bold">
              File SK <span className="text-danger">*</span>
            </label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <small className="text-muted">Format: PDF, JPG, PNG. Maks: 5MB</small>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-3">
            <span className="badge bg-info">
              <i className="bi bi-file-earmark me-1"></i>
              {selectedFile.name}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 d-flex justify-content-end gap-2">
          <Button
            classType="secondary"
            label="Batal"
            onClick={() => router.back()}
          />
          <Button
            classType="success"
            label={uploading ? "Mengupload..." : "Upload SK"}
            onClick={handleSubmit}
            iconName="cloud-upload"
            disabled={uploading}
          />
        </div>
      </Card>
    </MainContent>
  );
}
