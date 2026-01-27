"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";

const Editor = dynamic(() => import("@/components/common/Editor"), {
  ssr: false,
  loading: () => (
    <div className="p-3 border rounded text-muted">Loading Editor...</div>
  ),
});
import MainContent from "@/components/layout/MainContent";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import DropDown from "@/components/common/Dropdown";

import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";
import { useRouter } from "next/navigation";
import { encryptIdUrl } from "@/lib/encryptor";

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




export default function Page_Add_DropOut() {
  const router = useRouter();
  const userData = useMemo(() => getUserData(), []);

  const [prodiList, setProdiList] = useState([]);
  const [konsentrasiList, setKonsentrasiList] = useState([]);
  const [mahasiswaList, setMahasiswaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProdi, setSelectedProdi] = useState("");
  const [selectedKonsentrasi, setSelectedKonsentrasi] = useState("");
  const [selectedMhs, setSelectedMhs] = useState("");
  const [angkatanMahasiswa, setAngkatanMahasiswa] = useState("");


  // Form data untuk editor dengan placeholder - menggunakan state agar reactive
  const [formData, setFormData] = useState({
    menimbang: "",
    mengingat: "",
  });
  const [errors, setErrors] = useState({});
  
  // Placeholder text yang akan hilang saat user mengetik
  const placeholderText = {
    menimbang: "Contoh: Bahwa mahasiswa yang bersangkutan tidak mengikuti perkuliahan tanpa pemberitahuan selama 2 (dua) minggu berturut-turut.",
    mengingat: "Contoh: Buku Pedoman Mahasiswa tahun 2014 Pasal 61 ayat 3 point b mengenai pencabutan hak mengikuti perkuliahan (DO)."
  };



  /* ========================================================
     LOAD PROGRAM STUDI (NORMALIZED)
  ======================================================== */
  useEffect(() => {
    const loadProdi = async () => {
      setIsLoading(true);
      try {
        // Get JWT token
        const jwtToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('jwtToken='))
          ?.split('=')[1];
        
        // Cek apakah user adalah Prodi berdasarkan roleId
        const roleId = userData?.roleId || "";
        const isProdiByRole = roleId === "ROL71";
        
        // Cek apakah user punya prodiId
        const hasProdiId = !!(userData?.prodiId || userData?.kodeProdi);
        
        // User dianggap Prodi jika roleId = ROL71 ATAU punya prodiId
        const isProdi = isProdiByRole || hasProdiId;
        
        // User Admin: gunakan endpoint /prodi/list untuk mendapatkan semua prodi
        // User Prodi: gunakan endpoint /prodi untuk mendapatkan prodi sesuai user yang login
        const endpoint = isProdi 
          ? `${API_LINK}DropOut/prodi`
          : `${API_LINK}DropOut/prodi/list`;
        
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
          },
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error response body:", errorText);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const raw = await res.json();

        // Handle different response formats
        let dataArray = [];
        if (Array.isArray(raw)) {
          dataArray = raw;
        } else if (raw.data && Array.isArray(raw.data)) {
          dataArray = raw.data;
        } else if (raw.result && Array.isArray(raw.result)) {
          dataArray = raw.result;
        }

        const normalized = dataArray.map((item) => ({
          Value: item.Value ?? item.value ?? item.pro_id ?? item.id ?? "",
          Text: item.Text ?? item.text ?? item.pro_nama ?? item.nama ?? item.name ?? ""
        }));

        setProdiList(normalized || []);
        
        if (normalized.length === 0) {
          Toast.info("Tidak ada data program studi yang tersedia");
        } else {
          Toast.success(`Berhasil memuat ${normalized.length} program studi`);
        }
      } catch (err) {
        console.error("Error loading prodi:", err);
        Toast.error("Gagal memuat program studi: " + err.message);
        setProdiList([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (API_LINK) {
      loadProdi();
    } else {
      console.error("API_LINK is not defined");
      Toast.error("Konfigurasi API tidak ditemukan");
      setProdiList([]);
      setIsLoading(false);
    }
  }, [userData]);

  /* ========================================================
     ROLE PRODI → AUTO SET
  ======================================================== */
  useEffect(() => {
    if (!userData || prodiList.length === 0) return;

    // Cek apakah user adalah Prodi berdasarkan roleId
    const roleId = userData?.roleId || "";
    const isProdiByRole = roleId === "ROL71";
    const hasProdiId = !!(userData?.prodiId || userData?.kodeProdi);
    const isProdi = isProdiByRole || hasProdiId;
    
    // Untuk user Prodi, auto-set prodi dari list yang dikembalikan API
    if (isProdi && prodiList.length > 0 && !selectedProdi) {
      const firstProdi = prodiList[0].Value;
      
      setSelectedProdi(firstProdi);
      loadKonsentrasi(firstProdi);
    }
  }, [userData, prodiList, selectedProdi]);

  /* ========================================================
     LOAD KONSENTRASI (NORMALIZED)
  ======================================================== */
  const loadKonsentrasi = async (prodiId) => {
    try {
      // Get JWT token from cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      // Menggunakan parameter yang benar sesuai Swagger: prodiId
      const endpoint = `${API_LINK}DropOut/konsentrasi?prodiId=${prodiId}`;
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();

      // Handle different response formats
      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        dataArray = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        dataArray = data.result;
      }

      const normalized = dataArray.map((x) => ({
        Value: x.Value ?? x.value ?? x.kon_id ?? x.id ?? "",
        Text: x.Text ?? x.text ?? x.kon_nama ?? x.nama ?? x.name ?? ""
      }));

      setKonsentrasiList(normalized);
      
      if (normalized.length === 0) {
        Toast.info("Tidak ada konsentrasi untuk program studi ini");
      }
      
    } catch (err) {
      console.error("Error loading konsentrasi:", err);
      setKonsentrasiList([]);
      
      if (err.message.includes("400")) {
        Toast.error("Data konsentrasi belum tersedia untuk prodi ini");
      } else {
        Toast.error("Gagal memuat konsentrasi: " + err.message);
      }
    }
  };

  /* ========================================================
     LOAD MAHASISWA BY KONSENTRASI (NORMALIZED)
  ======================================================== */
  const loadMahasiswaByKonsentrasi = async (konsId) => {
    try {
      // Get JWT token from cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const endpoint = `${API_LINK}DropOut/mahasiswa-by-konsentrasi?konsentrasiId=${konsId}`;
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Mahasiswa error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();

      // Handle different response formats
      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        dataArray = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        dataArray = data.result;
      }

      const normalized = dataArray.map((x) => {
        let text = x.Text ?? x.text ?? x.mhs_nama ?? x.nama ?? x.name ?? "";
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
          Value: x.Value ?? x.value ?? x.mhs_id ?? x.id ?? "",
          Text: text
        };
      });

      setMahasiswaList(normalized);

      if (normalized.length === 0) {
        Toast.info("Tidak ada mahasiswa aktif pada konsentrasi ini.");
      } else {
        Toast.success(`Berhasil memuat ${normalized.length} mahasiswa`);
      }
    } catch (err) {
      console.error("Error loading mahasiswa:", err);
      setMahasiswaList([]);
      Toast.error("Gagal memuat daftar mahasiswa: " + err.message);
    }
  };

  /* ========================================================
     LOAD ANGKATAN BY MAHASISWA
  ======================================================== */
  const loadAngkatanByMahasiswa = async (mhsId) => {
    try {
      // Get JWT token from cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const endpoint = `${API_LINK}DropOut/angkatan-by-mahasiswa?mhsId=${mhsId}`;
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Angkatan error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();

      // Handle different response formats
      let angkatan = "";
      if (typeof data === 'string') {
        angkatan = data;
      } else if (data.angkatan) {
        angkatan = data.angkatan;
      } else if (data.value) {
        angkatan = data.value;
      } else if (data.result) {
        angkatan = data.result;
      }

      setAngkatanMahasiswa(angkatan);

      if (angkatan) {
        Toast.success(`Angkatan mahasiswa: ${angkatan}`);
      }
    } catch (err) {
      console.error("Error loading angkatan:", err);
      setAngkatanMahasiswa("");
      Toast.error("Gagal memuat angkatan mahasiswa: " + err.message);
    }
  };

  /* ========================================================
     CEK BEBAS TANGGUNGAN MAHASISWA (dipanggil saat submit)
  ======================================================== */
  const checkBebasTanggungan = async (mhsId) => {
    try {
      // Get JWT token from cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const endpoint = `${API_LINK}DropOut/mahasiswa/${encodeURIComponent(mhsId)}/bebas-tanggungan`;
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Bebas tanggungan error response:", errorText);
        return { isBebas: false, message: "Gagal memeriksa status tanggungan" };
      }
      
      const data = await res.json();

      // Handle response format: { isBebasTanggungan: false, message: "..." }
      let isBebas = false;
      let message = "Mahasiswa ini memiliki tanggungan yang belum diselesaikan.";
      
      if (data && typeof data === 'object') {
        isBebas = data.isBebasTanggungan === true;
        if (data.message) {
          message = data.message;
        }
      } else if (typeof data === 'boolean') {
        isBebas = data;
      }

      return { isBebas, message };
    } catch (err) {
      console.error("Error checking bebas tanggungan:", err);
      return { isBebas: false, message: "Gagal memeriksa status tanggungan" };
    }
  };

  /* ========================================================
     HANDLE SELECT
  ======================================================== */
  const handleSelectProdi = (val) => {
    setSelectedProdi(val);
    setSelectedKonsentrasi("");
    setSelectedMhs("");
    setAngkatanMahasiswa(""); // Reset angkatan
    setKonsentrasiList([]);
    setMahasiswaList([]);
    loadKonsentrasi(val);
  };

  const handleSelectKonsentrasi = (val) => {
    setSelectedKonsentrasi(val);
    setSelectedMhs("");
    setAngkatanMahasiswa(""); // Reset angkatan
    setMahasiswaList([]);
    
    if (val) {
      loadMahasiswaByKonsentrasi(val);
    }
  };

  const handleSelectMhs = (val) => {
    setSelectedMhs(val);
    setAngkatanMahasiswa(""); // Reset angkatan
    
    if (val) {
      loadAngkatanByMahasiswa(val);
    }
  };

  const handleEditorChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }, [errors]);



  /* ========================================================
     SUBMIT → CREATE DRAFT
  ======================================================== */
  const handleSubmit = async () => {
    // Validasi form
    const newErrors = {};
    
    if (!selectedProdi) newErrors.prodi = "Program studi wajib dipilih";
    if (!selectedKonsentrasi) newErrors.konsentrasi = "Konsentrasi wajib dipilih";
    if (!selectedMhs) newErrors.mahasiswa = "Mahasiswa wajib dipilih";
    if (!formData.menimbang.trim()) newErrors.menimbang = "Bagian Menimbang wajib diisi";
    if (!formData.mengingat.trim()) newErrors.mengingat = "Bagian Mengingat wajib diisi";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.error("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    // Cek bebas tanggungan saat submit
    const result = await checkBebasTanggungan(selectedMhs);
    
    if (!result.isBebas) {
      Toast.error("Tidak dapat mengajukan Drop Out. " + result.message);
      return;
    }

    const confirm = await SweetAlert({
      title: "Simpan Draft",
      text: "Apakah Anda yakin ingin menyimpan pengajuan sebagai draft?",
      icon: "info",
      confirmText: "Ya, Simpan!",
      confirmButtonColor: "#1e88e5",
    });

    if (!confirm) return;

    const payload = {
      mhsId: selectedMhs,
      lampiran: formData.menimbang,
      lampiranSuratPengajuan: formData.mengingat,
      createdBy: userData?.username || ""
    };

    try {
      // Get JWT token from cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const res = await fetch(`${API_LINK}DropOut/create-pengajuan`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        Toast.error(data?.message || "Gagal membuat pengajuan Drop Out");
        return;
      }

      Toast.success("Pengajuan Drop Out berhasil dibuat sebagai draft");
      // Redirect ke halaman list
      router.push(`/pages/administrasi-akademik/drop-out`);
    } catch (err) {
      console.error("Submit error:", err);
      Toast.error("Terjadi kesalahan server");
    }
  };

  return (
    <MainContent
      layout="Admin"
      title="Tambah Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out" }
      ]}
    >
      <Card title="Tambah Pengajuan Drop Out">
        {/* Row 1: Dropdown Selection */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <DropDown
              label="Program Studi"
              forInput="ddProdi"
              arrData={isLoading ? [] : prodiList}
              value={selectedProdi}
              onChange={(e) => handleSelectProdi(e.target.value)}
              isDisabled={isLoading || !!(userData?.prodiId || userData?.kodeProdi)}
              isRequired={true}
            />
            {isLoading && (
              <div className="text-muted small">Memuat data program studi...</div>
            )}
            {!isLoading && (userData?.prodiId || userData?.kodeProdi) && (
              <div className="text-muted small">Prodi sudah dipilih otomatis</div>
            )}
          </div>

          <div className="col-md-4">
            <DropDown
              label="Konsentrasi"
              forInput="ddKonsentrasi"
              arrData={konsentrasiList}
              value={selectedKonsentrasi}
              onChange={(e) => handleSelectKonsentrasi(e.target.value)}
              isDisabled={!selectedProdi}
              isRequired={true}
            />
          </div>

          <div className="col-md-4">
            <SearchableDropdown
              label="Mahasiswa"
              forInput="ddMahasiswa"
              arrData={mahasiswaList}
              value={selectedMhs}
              onChange={(e) => handleSelectMhs(e.target.value)}
              isDisabled={!selectedKonsentrasi}
              isRequired={true}
              placeholder="-- Pilih Mahasiswa --"
            />
            {selectedKonsentrasi && mahasiswaList.length === 0 && (
              <div className="text-muted small">Memuat data mahasiswa...</div>
            )}
          </div>
        </div>

        {/* Angkatan Section */}
        <div className="mb-4">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h6 className="fw-bold mb-0">Angkatan</h6>
              {angkatanMahasiswa && (
                <div className="mt-2">
                  <span className="badge bg-success fs-6 px-3 py-2 rounded-pill">
                    <i className="bi bi-calendar-check me-1"></i>
                    Angkatan {angkatanMahasiswa}
                  </span>
                </div>
              )}
              {selectedMhs && !angkatanMahasiswa && (
                <div className="mt-2">
                  <span className="text-muted small">Memuat angkatan mahasiswa...</span>
                </div>
              )}
            </div>
            <div className="col-md-6">
              {selectedMhs ? (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center"
                  onClick={() => router.push(`/pages/persiapan-perkuliahan/mahasiswa/detail/${encryptIdUrl(selectedMhs)}`)}
                >
                  <i className="bi bi-eye me-2" /> Lihat Profil Mahasiswa
                </button>
              ) : (
                <span className="text-muted d-flex align-items-center small">
                  <i className="bi bi-eye-slash me-2" /> Pilih mahasiswa untuk melihat profil
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Editor Section dengan Placeholder */}
        <div className="row g-3">
          <div className="col-md-6">
            <Editor
              label="Menimbang"
              name="menimbang"
              value={formData.menimbang}
              onChange={handleEditorChange}
              error={errors.menimbang}
              isRequired={true}
              placeholder={placeholderText.menimbang}
            />
          </div>

          <div className="col-md-6">
            <Editor
              label="Mengingat"
              name="mengingat"
              value={formData.mengingat}
              onChange={handleEditorChange}
              error={errors.mengingat}
              isRequired={true}
              placeholder={placeholderText.mengingat}
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
            classType="primary"
            label="Simpan"
            onClick={handleSubmit}
            iconName="floppy"
          />
        </div>
      </Card>
    </MainContent>
  );
}

