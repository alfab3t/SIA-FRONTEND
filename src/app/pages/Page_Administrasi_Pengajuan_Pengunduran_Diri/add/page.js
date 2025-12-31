"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import DropDown from "@/components/common/Dropdown";
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";
import fetchData from "@/lib/fetch";

export default function AddPengunduranDiri() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nim: "",
    namaMahasiswa: "",
    prodi: "",
    konsentrasi: "",
    angkatan: "",
    alasanPengunduran: "",
    tanggalPengunduran: "",
    keterangan: ""
  });

  // File upload states untuk mahasiswa
  const [fileSuratPernyataan, setFileSuratPernyataan] = useState(null);
  const [fileLampiran, setFileLampiran] = useState(null);

  const [dataMahasiswa, setDataMahasiswa] = useState([]);
  const [dataProdi, setDataProdi] = useState([]);
  const [dataKonsentrasi, setDataKonsentrasi] = useState([]);

  // Cek apakah user adalah mahasiswa
  const isMahasiswa = useMemo(() => {
    if (!userData?.role) return false;
    const role = userData.role.toUpperCase();
    return role.includes("MAHASISWA");
  }, [userData]);

  // Cek apakah user adalah prodi/admin
  const isProdiOrAdmin = useMemo(() => {
    if (!userData?.role) return false;
    const role = userData.role.toUpperCase();
    return role.includes("PRODI") || role.includes("ADMIN") || role === "NDA_PRODI";
  }, [userData]);

  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    // Jika mahasiswa, auto-fill data dari session
    if (isMahasiswa) {
      setFormData(prev => ({
        ...prev,
        nim: userData?.username || "",
        namaMahasiswa: userData?.displayName || userData?.nama || "",
        // Data lain bisa diambil dari API berdasarkan NIM
      }));
    } else if (isProdiOrAdmin) {
      // Load data untuk prodi/admin
      loadMahasiswa();
      loadProdi();
    }
  }, [ssoData, router, isMahasiswa, isProdiOrAdmin, userData]);

  const loadMahasiswa = async () => {
    try {
      // Simulasi data mahasiswa
      const mockMahasiswa = [
        { Value: "0320220118", Text: "0320220118 - MUHAMMAD JILBRAN" },
        { Value: "0320220075", Text: "0320220075 - SELVIANI" },
        { Value: "0320220054", Text: "0320220054 - Test User" }
      ];
      setDataMahasiswa(mockMahasiswa);
    } catch (err) {
      console.error("Error loading mahasiswa:", err);
    }
  };

  const loadProdi = async () => {
    try {
      // Simulasi data prodi
      const mockProdi = [
        { Value: "MI", Text: "Manajemen Informatika" },
        { Value: "TI", Text: "Teknik Informatika" },
        { Value: "SI", Text: "Sistem Informasi" }
      ];
      setDataProdi(mockProdi);
    } catch (err) {
      console.error("Error loading prodi:", err);
    }
  };

  const loadKonsentrasi = async (prodiId) => {
    try {
      // Simulasi data konsentrasi berdasarkan prodi
      const mockKonsentrasi = {
        "MI": [
          { Value: "PM", Text: "Programming & Mobile" },
          { Value: "WEB", Text: "Web Development" }
        ],
        "TI": [
          { Value: "RPL", Text: "Rekayasa Perangkat Lunak" },
          { Value: "NET", Text: "Network & Security" }
        ],
        "SI": [
          { Value: "BIS", Text: "Business Intelligence" },
          { Value: "ERP", Text: "Enterprise Resource Planning" }
        ]
      };
      setDataKonsentrasi(mockKonsentrasi[prodiId] || []);
    } catch (err) {
      console.error("Error loading konsentrasi:", err);
    }
  };

  const handleMahasiswaChange = (value) => {
    const selectedMhs = dataMahasiswa.find(mhs => mhs.Value === value);
    if (selectedMhs) {
      // Simulasi data mahasiswa yang dipilih
      setFormData(prev => ({
        ...prev,
        nim: value,
        namaMahasiswa: selectedMhs.Text.split(" - ")[1] || "",
        prodi: "MI",
        konsentrasi: "PM",
        angkatan: "2022"
      }));
      loadKonsentrasi("MI");
    }
  };

  const handleProdiChange = (value) => {
    setFormData(prev => ({
      ...prev,
      prodi: value,
      konsentrasi: ""
    }));
    loadKonsentrasi(value);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (fileType, file) => {
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

      if (fileType === 'suratPernyataan') {
        setFileSuratPernyataan(file);
      } else if (fileType === 'lampiran') {
        setFileLampiran(file);
      }
    }
  };

  const handleSubmit = async () => {
    // Validasi berdasarkan role
    if (isMahasiswa) {
      // Validasi untuk mahasiswa
      if (!fileSuratPernyataan) {
        Toast.error("Berkas Surat Pernyataan wajib diunggah");
        return;
      }
      if (!fileLampiran) {
        Toast.error("Berkas Lampiran wajib diunggah");
        return;
      }
    } else {
      // Validasi untuk prodi/admin
      if (!formData.nim) {
        Toast.error("NIM mahasiswa wajib dipilih");
        return;
      }
      if (!formData.alasanPengunduran) {
        Toast.error("Alasan pengunduran wajib diisi");
        return;
      }
      if (!formData.tanggalPengunduran) {
        Toast.error("Tanggal pengunduran wajib diisi");
        return;
      }
    }

    const confirm = await SweetAlert({
      title: "Simpan Pengajuan",
      text: "Apakah Anda yakin ingin menyimpan pengajuan pengunduran diri ini?",
      icon: "info",
      confirmText: "Ya, Simpan!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      setLoading(true);

      if (isMahasiswa) {
        // Untuk mahasiswa - upload berkas
        const formDataUpload = new FormData();
        formDataUpload.append("nim", formData.nim);
        formDataUpload.append("fileSuratPernyataan", fileSuratPernyataan);
        formDataUpload.append("fileLampiran", fileLampiran);
        
        // Simulasi API call untuk upload
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        Toast.success("Berkas pengajuan pengunduran diri berhasil diunggah");
      } else {
        // Untuk prodi/admin - simpan data form
        // Simulasi API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        Toast.success("Pengajuan pengunduran diri berhasil disimpan sebagai draft");
      }

      router.push("/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri");
    } catch (err) {
      Toast.error("Gagal menyimpan pengajuan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render form untuk mahasiswa
  if (isMahasiswa) {
    return (
      <MainContent
        layout="Admin"
        title="Pengajuan Pengunduran Diri"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Pengunduran Diri", href: "/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri" },
          { label: "Pengajuan Pengunduran Diri" }
        ]}
      >
        <Card title="Pengajuan Pengunduran Diri">
          <div className="row g-3">
            {/* Info Mahasiswa */}
            <div className="col-12">
              <div className="alert alert-info">
                <h6 className="alert-heading mb-2">
                  <i className="bi bi-info-circle me-2"></i>
                  Informasi Mahasiswa
                </h6>
                <div className="row">
                  <div className="col-md-4">
                    <strong>NIM:</strong> {formData.nim || "-"}
                  </div>
                  <div className="col-md-4">
                    <strong>Nama:</strong> {formData.namaMahasiswa || "-"}
                  </div>
                  <div className="col-md-4">
                    <strong>Program Studi:</strong> {formData.prodi || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Berkas */}
            <div className="col-12">
              <h6 className="fw-bold text-primary mb-3">
                <i className="bi bi-cloud-upload me-2"></i>
                Upload Berkas Pengajuan
              </h6>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">
                Berkas Surat Pernyataan / Memo <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange('suratPernyataan', e.target.files[0])}
              />
              <small className="text-muted">Format: PDF, JPG, PNG. Maks: 5MB</small>
              {fileSuratPernyataan && (
                <div className="mt-2">
                  <span className="badge bg-success">
                    <i className="bi bi-file-earmark me-1"></i>
                    {fileSuratPernyataan.name}
                  </span>
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">
                Berkas Lampiran <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange('lampiran', e.target.files[0])}
              />
              <small className="text-muted">Format: PDF, JPG, PNG. Maks: 5MB</small>
              {fileLampiran && (
                <div className="mt-2">
                  <span className="badge bg-success">
                    <i className="bi bi-file-earmark me-1"></i>
                    {fileLampiran.name}
                  </span>
                </div>
              )}
            </div>

            {/* Petunjuk */}
            <div className="col-12">
              <div className="alert alert-warning">
                <h6 className="alert-heading mb-2">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Petunjuk Upload Berkas
                </h6>
                <ul className="mb-0">
                  <li><strong>Surat Pernyataan/Memo:</strong> Surat pernyataan pengunduran diri yang telah ditandatangani</li>
                  <li><strong>Berkas Lampiran:</strong> Dokumen pendukung lainnya (transkrip nilai, surat keterangan, dll)</li>
                  <li>Pastikan berkas dalam format PDF, JPG, atau PNG dengan ukuran maksimal 5MB</li>
                  <li>Berkas yang sudah diunggah akan diproses oleh admin prodi</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 d-flex justify-content-end gap-2">
            <Button
              classType="secondary"
              label="Batal"
              onClick={() => router.back()}
            />
            <Button
              classType="success"
              label={loading ? "Mengunggah..." : "Unggah Berkas"}
              onClick={handleSubmit}
              iconName="cloud-upload"
              disabled={loading}
            />
          </div>
        </Card>
      </MainContent>
    );
  }

  // Render form untuk prodi/admin (form lengkap seperti sebelumnya)
  return (
    <MainContent
      layout="Admin"
      title="Tambah Pengajuan Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Pengunduran Diri", href: "/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri" },
        { label: "Tambah Pengajuan" }
      ]}
    >
      <Card title="Form Pengajuan Pengunduran Diri Mahasiswa">
        <div className="row g-3">
          {/* Data Mahasiswa */}
          <div className="col-12">
            <h6 className="fw-bold text-primary mb-3">
              <i className="bi bi-person me-2"></i>
              Data Mahasiswa
            </h6>
          </div>

          <div className="col-md-6">
            <DropDown
              arrData={dataMahasiswa}
              label="Pilih Mahasiswa"
              value={formData.nim}
              onChange={handleMahasiswaChange}
              isRequired={true}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="text"
              label="Nama Mahasiswa"
              value={formData.namaMahasiswa}
              disabled={true}
            />
          </div>

          <div className="col-md-4">
            <DropDown
              arrData={dataProdi}
              label="Program Studi"
              value={formData.prodi}
              onChange={handleProdiChange}
              disabled={true}
            />
          </div>

          <div className="col-md-4">
            <DropDown
              arrData={dataKonsentrasi}
              label="Konsentrasi"
              value={formData.konsentrasi}
              onChange={(value) => handleInputChange("konsentrasi", value)}
              disabled={true}
            />
          </div>

          <div className="col-md-4">
            <Input
              type="text"
              label="Angkatan"
              value={formData.angkatan}
              disabled={true}
            />
          </div>

          {/* Data Pengunduran */}
          <div className="col-12 mt-4">
            <h6 className="fw-bold text-primary mb-3">
              <i className="bi bi-file-text me-2"></i>
              Data Pengunduran Diri
            </h6>
          </div>

          <div className="col-md-6">
            <Input
              type="date"
              label="Tanggal Pengunduran"
              value={formData.tanggalPengunduran}
              onChange={(e) => handleInputChange("tanggalPengunduran", e.target.value)}
              isRequired={true}
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-bold">
              Alasan Pengunduran <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control"
              rows="4"
              placeholder="Masukkan alasan pengunduran diri..."
              value={formData.alasanPengunduran}
              onChange={(e) => handleInputChange("alasanPengunduran", e.target.value)}
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-bold">Keterangan Tambahan</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Masukkan keterangan tambahan (opsional)..."
              value={formData.keterangan}
              onChange={(e) => handleInputChange("keterangan", e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 d-flex justify-content-end gap-2">
          <Button
            classType="secondary"
            label="Batal"
            onClick={() => router.back()}
          />
          <Button
            classType="success"
            label={loading ? "Menyimpan..." : "Simpan Draft"}
            onClick={handleSubmit}
            iconName="save"
            disabled={loading}
          />
        </div>
      </Card>
    </MainContent>
  );
}