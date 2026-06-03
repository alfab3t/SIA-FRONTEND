"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import PropTypes from "prop-types";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Toast from "@/components/common/Toast";
import Loading from "@/components/common/Loading";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";
import fetchData from "@/lib/fetch";
function SearchableDropdown({
  label,
  forInput,
  arrData = [],
  value,
  onChange,
  isDisabled = false,
  isRequired = false,
  placeholder = "-- Pilih --"
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const filteredData = useMemo(() => {
    if (!searchTerm) return arrData;
    return arrData.filter((item) =>
      item.Text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [arrData, searchTerm]);
  const selectedText = useMemo(() => {
    const selected = arrData.find((item) => item.Value === value);
    return selected ? selected.Text : placeholder;
  }, [arrData, value, placeholder]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleSelect = (selectedValue) => {
    onChange({ target: { value: selectedValue } });
    setIsOpen(false);
    setSearchTerm("");
  };
  return (
    <div className="mb-3" ref={dropdownRef}>
      <label htmlFor={forInput} className="form-label fw-bold">
        {label}
        {isRequired && <span className="text-danger"> *</span>}
      </label>
      <div className="position-relative">
        <button
          type="button"
          className="form-select text-start"
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          disabled={isDisabled}
          style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
        >
          {selectedText}
        </button>
        {isOpen && (
          <div
            className="position-absolute w-100 border rounded shadow-sm"
            style={{ 
              zIndex: 1000, 
              maxHeight: "300px", 
              overflowY: "auto",
              backgroundColor: "#e7f3ff"
            }}
          >
            <div className="p-2 border-bottom" style={{ backgroundColor: "#e7f3ff" }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <button
                    key={item.Value}
                    type="button"
                    className={`w-100 text-start border-0 px-3 py-2 ${
                      item.Value === value ? "bg-primary text-white" : "text-dark"
                    }`}
                    style={{ 
                      cursor: "pointer",
                      backgroundColor: item.Value === value ? "#0d6efd" : "transparent",
                      color: item.Value === value ? "#ffffff" : "#212529"
                    }}
                    onClick={() => handleSelect(item.Value)}
                    onMouseEnter={(e) => {
                      if (item.Value !== value) {
                        e.target.style.backgroundColor = "#0d6efd";
                        e.target.style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.Value !== value) {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "#212529";
                      }
                    }}
                  >
                    {item.Text}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-muted">Tidak ada data</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
SearchableDropdown.propTypes = {
  label: PropTypes.string.isRequired,
  forInput: PropTypes.string.isRequired,
  arrData: PropTypes.arrayOf(
    PropTypes.shape({
      Value: PropTypes.string,
      Text: PropTypes.string,
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool,
  isRequired: PropTypes.bool,
  placeholder: PropTypes.string,
};
export default function AddPengunduranDiri() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);
  const [loading, setLoading] = useState(false);
  const [loadingMahasiswaDetails, setLoadingMahasiswaDetails] = useState(false);
  const [formData, setFormData] = useState({
    nim: "",
    namaMahasiswa: "",
    prodi: "",
    angkatan: ""
  });
  const [fileSuratPernyataan, setFileSuratPernyataan] = useState(null);
  const [fileLampiran, setFileLampiran] = useState(null);
  const [dataMahasiswa, setDataMahasiswa] = useState([]);
  const [errors, setErrors] = useState({});
  const [existingSubmissions, setExistingSubmissions] = useState([]);
  const [hasActiveSubmission, setHasActiveSubmission] = useState(false);
  const roleId = userData?.roleId || "";
  const isMahasiswa = roleId === "ROL23";
  const isProdi = roleId === "ROL71";
  const isAdmin = roleId === "ROL21";
  const isProdiOrAdmin = isProdi || isAdmin;
  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }
    if (isMahasiswa) {
      loadMahasiswaData(userData?.username || userData?.nim);
      checkExistingSubmission(userData?.username || userData?.nim);
    } else if (isProdiOrAdmin) {
      loadMahasiswa();
    }
  }, [ssoData, router, isMahasiswa, isProdiOrAdmin, userData]);
  
  const checkExistingSubmission = async (mhsId) => {
    try {
      const response = await fetchData(API_LINK + "PengunduranDiri", { p1: mhsId }, "GET");
      const submissions = Array.isArray(response) ? response : [];
      
      // Cek apakah ada pengajuan aktif (bukan Ditolak dan bukan Disetujui)
      const activeSubmission = submissions.find(sub => {
        const status = (sub.status || sub.Status || "").toLowerCase();
        return !status.includes("ditolak") && status !== "disetujui";
      });
      
      setHasActiveSubmission(!!activeSubmission);
    } catch (err) {
      // Error checking existing submission
    }
  };
  const loadMahasiswaData = async (nim) => {
    try {
      setFormData(prev => ({ ...prev, nim: nim }));
      const [angkatanResponse, prodiResponse] = await Promise.all([
        fetchData(API_LINK + `PengunduranDiri/mahasiswa/${nim}/angkatan`, {}, "GET"),
        fetchData(API_LINK + `PengunduranDiri/mahasiswa/${nim}/prodi`, {}, "GET")
      ]);
      let angkatan = "";
      if (angkatanResponse && !angkatanResponse.error) {
        angkatan = angkatanResponse.dulAngkatan || angkatanResponse.angkatan || "";
      }
      let prodi = "";
      if (prodiResponse && !prodiResponse.error) {
        prodi = prodiResponse.proNama || prodiResponse.prodi || "";
      }
      setFormData(prev => ({
        ...prev,
        nim: nim,
        namaMahasiswa: userData?.fullName || userData?.displayName || nim,
        prodi: prodi || "Manajemen Informatika",
        angkatan: angkatan || "2024"
      }));
    } catch (err) {
      setFormData(prev => ({
        ...prev,
        nim: nim,
        namaMahasiswa: nim,
        prodi: "Manajemen Informatika",
        angkatan: "2024"
      }));
    }
  };
  const loadMahasiswa = async () => {
    try {
      // Fetch mahasiswa dan semua pengajuan aktif (bukan Ditolak dan Disetujui)
      const [mahasiswaResponse, draftResponse, belumDisetujuiProdiResponse, belumDisetujuiWadirResponse, menungguUploadResponse] = await Promise.all([
        fetchData(API_LINK + "PengunduranDiri/mahasiswa/by-konsentrasi", {}, "GET"),
        fetchData(API_LINK + "PengunduranDiri", { status: "Draft" }, "GET").catch(() => []),
        fetchData(API_LINK + "PengunduranDiri", { status: "Belum Disetujui Prodi" }, "GET").catch(() => []),
        fetchData(API_LINK + "PengunduranDiri", { status: "Belum Disetujui Wadir 1" }, "GET").catch(() => []),
        fetchData(API_LINK + "PengunduranDiri", { status: "Menunggu Upload SK" }, "GET").catch(() => [])
      ]);
      
      if (mahasiswaResponse && !mahasiswaResponse.error) {
        const mahasiswaData = Array.isArray(mahasiswaResponse) ? mahasiswaResponse : [];
        const formattedData = mahasiswaData.map(mhs => {
          let originalText = mhs.nimNama || mhs.text || mhs.nama || "";
          const nim = mhs.value || mhs.nim || mhs.id || "";
          
          // Cek apakah text sudah mengandung NIM di awal
          let displayText = originalText;
          if (originalText && !originalText.startsWith(nim)) {
            // Jika belum ada NIM, tambahkan
            displayText = `${nim} - ${originalText}`;
          }
          
          return {
            Value: nim,
            Text: displayText,
            prodi: mhs.prodi || "Manajemen Informatika",
            angkatan: mhs.angkatan || "2022"
          };
        });
        setDataMahasiswa(formattedData);
      }
      
      // Gabungkan semua pengajuan aktif
      const extractArray = (response) => {
        if (Array.isArray(response)) return response;
        if (response?.data && Array.isArray(response.data)) return response.data;
        if (response?.result && Array.isArray(response.result)) return response.result;
        return [];
      };
      
      const allActiveSubmissions = [
        ...extractArray(draftResponse),
        ...extractArray(belumDisetujuiProdiResponse),
        ...extractArray(belumDisetujuiWadirResponse),
        ...extractArray(menungguUploadResponse)
      ];
      
      setExistingSubmissions(allActiveSubmissions);
    } catch (err) {
      Toast.error("Gagal memuat mahasiswa");
    }
  };

  const handleMahasiswaChange = async (value) => {
    setErrors(prev => ({ ...prev, nim: null }));
    const selectedMhs = dataMahasiswa.find(mhs => mhs.Value === value);
    if (selectedMhs) {
      // Ambil nama dari Text yang sudah berformat "NIM - Nama"
      const namaParts = selectedMhs.Text.split(" - ");
      const nama = namaParts.length > 1 ? namaParts.slice(1).join(" - ") : selectedMhs.Text;
      setLoadingMahasiswaDetails(true);
      setFormData(prev => ({ ...prev, nim: value, namaMahasiswa: nama, prodi: "Memuat...", angkatan: "Memuat..." }));
      try {
        const [angkatanResponse, prodiResponse] = await Promise.all([
          fetchData(API_LINK + `PengunduranDiri/mahasiswa/${value}/angkatan`, {}, "GET"),
          fetchData(API_LINK + `PengunduranDiri/mahasiswa/${value}/prodi`, {}, "GET")
        ]);
        let angkatan = "2022";
        if (angkatanResponse && !angkatanResponse.error) {
          angkatan = angkatanResponse.dulAngkatan || angkatanResponse.angkatan || "2022";
        }
        let prodi = "Manajemen Informatika";
        if (prodiResponse && !prodiResponse.error) {
          prodi = prodiResponse.proNama || prodiResponse.prodi || "Manajemen Informatika";
        }
        setFormData(prev => ({ ...prev, nim: value, namaMahasiswa: nama, prodi: String(prodi), angkatan: String(angkatan) }));
      } catch (err) {
        setFormData(prev => ({ ...prev, nim: value, namaMahasiswa: nama, prodi: "Manajemen Informatika", angkatan: "2022" }));
        Toast.error("Gagal memuat detail mahasiswa");
      } finally {
        setLoadingMahasiswaDetails(false);
      }
    }
  };
  const handleFileChange = (fileType, file) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        Toast.error("Format file tidak didukung. Gunakan PDF, JPG, atau PNG.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        Toast.error("Ukuran file maksimal 5MB");
        return;
      }
      if (fileType === 'suratPernyataan') {
        setFileSuratPernyataan(file);
        setErrors(prev => ({ ...prev, fileSuratPernyataan: null }));
      } else if (fileType === 'lampiran') {
        setFileLampiran(file);
        setErrors(prev => ({ ...prev, fileLampiran: null }));
      }
    }
  };
  const uploadFiles = async (fileSurat, fileLamp) => {
    const formDataUpload = new FormData();
    if (fileSurat) {
      formDataUpload.append('lampiranSuratPengajuan', fileSurat);
    }
    if (fileLamp) {
      formDataUpload.append('lampiran', fileLamp);
    }
    const jwtToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('jwtToken='))
      ?.split('=')[1];
    
    const uploadUrl = `${API_LINK}PengunduranDiri/upload`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
      },
      body: formDataUpload
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${res.status} - ${errorText}`);
    }
    const result = await res.json();
    return result;
  };
  const handleSubmit = async () => {
    // Validasi field wajib
    const newErrors = {};
    
    const mhsId = formData.nim || userData?.nim || userData?.username || "";
    if (!mhsId) {
      newErrors.nim = "Mahasiswa wajib dipilih";
    }
    
    // if (!fileSuratPernyataan) {
    //   newErrors.fileSuratPernyataan = "Berkas Surat Pernyataan wajib diunggah";
    // }
    
    // if (!fileLampiran) {
    //   newErrors.fileLampiran = "Berkas Lampiran wajib diunggah";
    // }
    
    // setErrors(newErrors);
    
    // if (Object.keys(newErrors).length > 0) {
    //   Toast.error("Mohon lengkapi semua field yang wajib diisi");
    //   return;
    // }
    
    // Validasi apakah mahasiswa sudah memiliki pengajuan aktif (bukan Ditolak)
    
    const existingSubmission = existingSubmissions.find(sub => {
      const subMhsId = sub.mhsId || sub.nim || sub.id;
      const subStatus = (sub.status || sub.Status || "").toLowerCase();
      return subMhsId === mhsId && !subStatus.includes("ditolak");
    });
    
    if (existingSubmission) {
      const statusPengajuan = existingSubmission.status || existingSubmission.Status || "aktif";
      Toast.error(
        `Mahasiswa ini sudah memiliki pengajuan dengan status "${statusPengajuan}". ` +
        `Pengajuan baru hanya dapat dibuat jika status pengajuan sebelumnya "Ditolak".`
      );
      return;
    }
    
    if (isProdiOrAdmin) {
      try {
        const response = await fetchData(
          API_LINK + `PengunduranDiri/mahasiswa/${encodeURIComponent(mhsId)}/bebas-tanggungan`,
          {},
          "GET"
        );
        let isBebas = false;
        let errorMessage = "Mahasiswa ini memiliki tanggungan yang belum diselesaikan.";
        if (response && typeof response === 'object') {
          isBebas = response.isBebasTanggungan === true;
          if (response.message) {
            errorMessage = response.message;
          }
        } else if (typeof response === 'boolean') {
          isBebas = response;
        }
        if (!isBebas) {
          Toast.error("Tidak dapat mengajukan Pengunduran Diri. Mahasiswa masih memiliki tanggungan.");
          return;
        }
      } catch (err) {
        Toast.error("Gagal memeriksa status tanggungan. Silakan coba lagi.");
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
      let lampiranSuratPengajuanFileName = "";
      let lampiranFileName = "";
      if (fileSuratPernyataan || fileLampiran) {
        const uploadResult = await uploadFiles(fileSuratPernyataan, fileLampiran);
        lampiranSuratPengajuanFileName = uploadResult.lampiranSuratPengajuan || uploadResult.lampiranSuratPengajuanFileName || "";
        lampiranFileName = uploadResult.lampiran || uploadResult.lampiranFileName || "";
      }
      const currentUsername = ssoData?.username || userData?.username || "";
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      let res;
      if (isProdiOrAdmin) {
        const payload = {
          mhsId: mhsId,
          lampiranSuratPengajuan: lampiranSuratPengajuanFileName,
          lampiran: lampiranFileName,
          createdBy: currentUsername
        };
        res = await fetch(`${API_LINK}PengunduranDiri/create-by-prodi/draft`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
          },
          body: JSON.stringify(payload)
        });
      } else {
        const payload = {
          step: "STEP1",
          draftId: "",
          mhsId: mhsId,
          lampiranSuratPengajuan: lampiranSuratPengajuanFileName,
          lampiran: lampiranFileName,
          createdBy: currentUsername
        };
        
        res = await fetch(`${API_LINK}PengunduranDiri/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(jwtToken && { Authorization: `Bearer ${jwtToken}` })
          },
          body: JSON.stringify(payload)
        });
        
      }
      const responseText = await res.text();
      
      let response;
      if (res.ok) {
        try {
          response = JSON.parse(responseText);
        } catch (parseError) {
          response = { success: true };
        }
      } else {
        response = { error: true, message: responseText };
      }
      if (response && !response.error) {
        Toast.success("Pengajuan pengunduran diri berhasil disimpan");
        // Redirect dan reload halaman utama
        router.push("/pages/administrasi-akademik/pengunduran-diri");
        // Tunggu sebentar untuk memastikan redirect selesai, lalu reload
        setTimeout(() => {
          if (window.location.pathname === "/pages/administrasi-akademik/pengunduran-diri") {
            window.location.reload();
          }
        }, 500);
      } else {
        Toast.error(response?.message || "Gagal menyimpan pengajuan");
      }
    } catch (err) {
      Toast.error("Gagal menyimpan pengajuan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <MainContent
      layout="Admin"
      title="Pengajuan Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Pengunduran Diri", href: "/pages/administrasi-akademik/Page_Administrasi_Pengajuan_Pengunduran_Diri" },
        { label: "Pengajuan Pengunduran Diri" }
      ]}
    >
      {/* Loading overlay saat fetch data */}
      <Loading loading={loading || loadingMahasiswaDetails} message="Memuat data..." />
      
      {isMahasiswa && hasActiveSubmission && (
        <div className="alert alert-warning mb-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Anda sudah memiliki pengajuan yang sedang diproses. Pengajuan baru hanya dapat dibuat setelah pengajuan sebelumnya selesai (Disetujui atau Ditolak).
        </div>
      )}
      <Card title="Pengajuan Pengunduran Diri">
        {}
        {!isMahasiswa && (
          <div className="mb-4">
            <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
              <i className="bi bi-person me-2" />
              {' '}Data Mahasiswa
            </h6>
            <div className="row g-3">
              <div className="col-lg-8 col-md-7">
                <SearchableDropdown
                  arrData={dataMahasiswa}
                  label="Mahasiswa"
                  forInput="mahasiswa"
                  value={formData.nim}
                  onChange={async (e) => await handleMahasiswaChange(e.target.value)}
                  isRequired={true}
                  placeholder="-- Pilih Mahasiswa --"
                />
                {errors.nim && (
                  <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-circle me-1" />
                    {errors.nim}
                  </div>
                )}
              </div>
              <div className="col-lg-4 col-md-5">
                <label htmlFor="angkatanMahasiswa" className="form-label fw-bold">Angkatan</label>
                <input
                  id="angkatanMahasiswa"
                  type="text"
                  className="form-control"
                  value={loadingMahasiswaDetails ? "Memuat..." : formData.angkatan}
                  disabled
                />
              </div>
              <div className="col-12">
                <label htmlFor="prodiMahasiswa" className="form-label fw-bold">Program Studi</label>
                <input
                  id="prodiMahasiswa"
                  type="text"
                  className="form-control"
                  value={loadingMahasiswaDetails ? "Memuat..." : formData.prodi}
                  disabled
                />
              </div>
            </div>
          </div>
        )}
        <div className="mb-4">
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            <i className="bi bi-cloud-upload me-2" />
            {' '}Upload Berkas Pengajuan
          </h6>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="form-label fw-bold mb-2">
                Berkas Surat Pernyataan <span className="text-danger">*</span>
              </div>
              <input
                type="file"
                className={`form-control ${errors.fileSuratPernyataan ? 'is-invalid' : ''}`}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange('suratPernyataan', e.target.files[0])}
              />
              <small className="text-muted mt-1 d-block">Format: PDF, JPG, PNG. Maksimal: 5MB</small>
              {errors.fileSuratPernyataan && (
                <div className="invalid-feedback d-block">
                  <i className="bi bi-exclamation-circle me-1" />
                  {errors.fileSuratPernyataan}
                </div>
              )}
              {fileSuratPernyataan && (
                <div className="mt-2">
                  <span className="badge bg-success">
                    <i className="bi bi-file-earmark-check me-1" />
                    {' '}{fileSuratPernyataan.name}
                  </span>
                </div>
              )}
            </div>
            <div className="col-md-6">
              <div className="form-label fw-bold mb-2">
                Berkas Lampiran <span className="text-danger">*</span>
              </div>
              <input
                type="file"
                className={`form-control ${errors.fileLampiran ? 'is-invalid' : ''}`}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange('lampiran', e.target.files[0])}
              />
              <small className="text-muted mt-1 d-block">Format: PDF, JPG, PNG. Maksimal: 5MB</small>
              {errors.fileLampiran && (
                <div className="invalid-feedback d-block">
                  <i className="bi bi-exclamation-circle me-1" />
                  {errors.fileLampiran}
                </div>
              )}
              {fileLampiran && (
                <div className="mt-2">
                  <span className="badge bg-success">
                    <i className="bi bi-file-earmark-check me-1" />
                    {' '}{fileLampiran.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center pt-3 border-top">
          <div className="text-muted small">
            <i className="bi bi-info-circle me-1" />
            {' '}Pastikan semua data sudah benar sebelum menyimpan
          </div>
          <div className="d-flex gap-2">
            <Button
              classType="secondary"
              label="Batal"
              onClick={() => router.back()}
              iconName="arrow-left"
            />
            <Button
              classType="success"
              label={loading ? "Mengunggah..." : "Simpan Pengajuan"}
              onClick={handleSubmit}
              iconName="cloud-upload"
              disabled={loading || (isMahasiswa && hasActiveSubmission)}
            />
          </div>
        </div>
      </Card>
    </MainContent>
  );
}
