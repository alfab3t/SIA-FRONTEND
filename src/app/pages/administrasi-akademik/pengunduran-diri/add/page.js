"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import PropTypes from "prop-types";
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";
import fetchData from "@/lib/fetch";

// SearchableDropdown Component (inline)
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

  // Role-based access menggunakan roleId
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
    } else if (isProdiOrAdmin) {
      loadMahasiswa();
    }
  }, [ssoData, router, isMahasiswa, isProdiOrAdmin, userData]);

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
      console.error("Error loading mahasiswa data:", err);
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
      // Gunakan endpoint by-konsentrasi untuk prodi
      const response = await fetchData(API_LINK + "PengunduranDiri/mahasiswa/by-konsentrasi", {}, "GET");
      if (response && !response.error) {
        const mahasiswaData = Array.isArray(response) ? response : [];
        const formattedData = mahasiswaData.map(mhs => {
          let text = mhs.nimNama || mhs.text || `${mhs.value || mhs.nim} - ${mhs.text || mhs.nama}`;
          // Hapus NIM di depan nama jika ada (format: "NIM - NAMA" atau "NIM-NAMA")
          if (text.includes(" - ")) {
            text = text.split(" - ").slice(1).join(" - ").trim();
          } else if (text.includes("-")) {
            const parts = text.split("-");
            // Cek apakah bagian pertama adalah angka (NIM)
            if (parts[0] && /^\d+$/.test(parts[0].trim())) {
              text = parts.slice(1).join("-").trim();
            }
          }
          return {
            Value: mhs.value || mhs.nim || mhs.id,
            Text: text,
            prodi: mhs.prodi || "Manajemen Informatika",
            angkatan: mhs.angkatan || "2022"
          };
        });
        setDataMahasiswa(formattedData);
      }
    } catch (err) {
      console.error("Error loading mahasiswa list:", err);
      Toast.error("Gagal memuat mahasiswa");
    }
  };

  const handleMahasiswaChange = async (value) => {
    const selectedMhs = dataMahasiswa.find(mhs => mhs.Value === value);
    if (selectedMhs) {
      const namaParts = selectedMhs.Text.split(" - ");
      const nama = namaParts.length > 1 ? namaParts[1] : selectedMhs.Text;
      
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
        console.error("Error loading mahasiswa details:", err);
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
      } else if (fileType === 'lampiran') {
        setFileLampiran(file);
      }
    }
  };

  // Upload files ke server dan dapatkan fileName
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
    const mhsId = formData.nim || userData?.nim || userData?.username || "";

    if (!mhsId) {
      Toast.error("Data mahasiswa wajib tersedia");
      return;
    }

    // Untuk Prodi/Admin, cek bebas tanggungan saat submit
    if (isProdiOrAdmin) {
      try {
        const response = await fetchData(
          API_LINK + `PengunduranDiri/mahasiswa/${encodeURIComponent(mhsId)}/bebas-tanggungan`,
          {},
          "GET"
        );
        
        // Handle response format: { isBebasTanggungan: false, message: "..." }
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
          Toast.error("Tidak dapat mengajukan Pengunduran Diri. " + errorMessage);
          return;
        }
      } catch (err) {
        console.error("Error checking tanggungan:", err);
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

      // Upload kedua file sekaligus dan dapatkan fileNames dari server
      let lampiranSuratPengajuanFileName = "";
      let lampiranFileName = "";

      if (fileSuratPernyataan || fileLampiran) {
        const uploadResult = await uploadFiles(fileSuratPernyataan, fileLampiran);
        // Ambil fileName dari response
        lampiranSuratPengajuanFileName = uploadResult.lampiranSuratPengajuan || uploadResult.lampiranSuratPengajuanFileName || "";
        lampiranFileName = uploadResult.lampiran || uploadResult.lampiranFileName || "";
      }

      // createdBy harus username user yang login (bukan NIM mahasiswa yang dipilih)
      const currentUsername = ssoData?.username || userData?.username || "";

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      let res;
      
      // Gunakan endpoint berbeda untuk Prodi/Admin vs Mahasiswa
      if (isProdiOrAdmin) {
        // Prodi/Admin: gunakan endpoint create-by-prodi/draft
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
        // Mahasiswa: gunakan endpoint create biasa
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
          console.error("Error parsing response:", parseError);
          response = { success: true };
        }
      } else {
        response = { error: true, message: responseText };
      }

      if (response && !response.error) {
        Toast.success("Pengajuan pengunduran diri berhasil disimpan");
        setTimeout(() => {
          router.push("/pages/administrasi-akademik/pengunduran-diri");
        }, 1000);
      } else {
        Toast.error(response?.message || "Gagal menyimpan pengajuan");
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      Toast.error("Gagal menyimpan pengajuan: " + (err?.message || "Unknown error"));
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
      <Card title="Pengajuan Pengunduran Diri">
        {/* Data Mahasiswa Section - Hanya untuk Prodi/Admin */}
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
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange('suratPernyataan', e.target.files[0])}
              />
              <small className="text-muted mt-1 d-block">Format: PDF, JPG, PNG. Maksimal: 5MB</small>
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
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange('lampiran', e.target.files[0])}
              />
              <small className="text-muted mt-1 d-block">Format: PDF, JPG, PNG. Maksimal: 5MB</small>
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
              disabled={loading}
            />
          </div>
        </div>
      </Card>
    </MainContent>
  );
}
