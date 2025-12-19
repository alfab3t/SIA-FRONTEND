"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

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
import SearchableDropdown from "@/components/common/SearchableDropdown";
import ProfilMahasiswaModal from "@/components/common/ProfilMahasiswaModal";
import Toast from "@/components/common/Toast";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";
import { useRouter } from "next/navigation";



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
  const [showProfilModal, setShowProfilModal] = useState(false);

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

  // Debug logging
  useEffect(() => {
    console.log("ProdiList updated:", prodiList);
  }, [prodiList]);

  useEffect(() => {
    console.log("KonsentrasiList updated:", konsentrasiList);
  }, [konsentrasiList]);

  useEffect(() => {
    console.log("MahasiswaList updated:", mahasiswaList);
  }, [mahasiswaList]);

  useEffect(() => {
    console.log("Selected states - Prodi:", selectedProdi, "Konsentrasi:", selectedKonsentrasi, "Mahasiswa:", selectedMhs);
  }, [selectedProdi, selectedKonsentrasi, selectedMhs]);

  useEffect(() => {
    console.log("Angkatan mahasiswa updated:", angkatanMahasiswa);
  }, [angkatanMahasiswa]);

  // Test API connection
  const testApiConnection = async () => {
    try {
      console.log("Testing API connection to:", API_LINK);
      const response = await fetch(API_LINK, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
      console.log("API connection test:", response.status);
      return response.ok;
    } catch (error) {
      console.error("API connection failed:", error);
      return false;
    }
  };



  /* ========================================================
     LOAD PROGRAM STUDI (NORMALIZED)
  ======================================================== */
  useEffect(() => {
    const loadProdi = async () => {
      setIsLoading(true);
      try {
        console.log("API_LINK:", API_LINK);
        console.log("Loading prodi from:", `${API_LINK}DropOut/prodi`);
        
        // Test API connection first
        console.log("Starting API connection test...");
        const isConnected = await testApiConnection();
        console.log("API connection result:", isConnected);
        
        if (!isConnected) {
          console.warn("API connection test failed, but continuing with prodi fetch...");
          // Don't throw error, continue with prodi fetch
        }
        
        const res = await fetch(`${API_LINK}DropOut/prodi`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log("Response status:", res.status);
        console.log("Response ok:", res.ok);
        console.log("Response headers:", res.headers);
        console.log("Response URL:", res.url);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error response body:", errorText);
          throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
        }
        
        const raw = await res.json();
        console.log("Raw prodi data:", raw);

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

        console.log("Normalized prodi data:", normalized);
        setProdiList(normalized);
        
        if (normalized.length === 0) {
          Toast.info("Tidak ada data program studi yang tersedia");
        }
      } catch (err) {
        console.error("Error loading prodi:", err);
        
        // Jika error karena CORS atau network, coba tanpa mode cors
        if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
          console.log("Trying fallback fetch without CORS mode...");
          try {
            const fallbackRes = await fetch(`${API_LINK}DropOut/prodi`);
            if (fallbackRes.ok) {
              const raw = await fallbackRes.json();
              const normalized = Array.isArray(raw) ? raw.map((item) => ({
                Value: item.Value ?? item.value ?? item.pro_id ?? item.id ?? "",
                Text: item.Text ?? item.text ?? item.pro_nama ?? item.nama ?? item.name ?? ""
              })) : [];
              setProdiList(normalized);
              Toast.success("Data prodi berhasil dimuat");
              return;
            }
          } catch (fallbackErr) {
            console.error("Fallback fetch also failed:", fallbackErr);
          }
        }
        
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
  }, []);

  /* ========================================================
     ROLE PRODI → AUTO SET
  ======================================================== */
  useEffect(() => {
    if (!userData) return;

    if (userData.role?.toUpperCase() === "PRODI") {
      setSelectedProdi(userData.prodiId);
      loadKonsentrasi(userData.prodiId);
    }
  }, [userData]);

  /* ========================================================
     LOAD KONSENTRASI (NORMALIZED)
  ======================================================== */
  const loadKonsentrasi = async (prodiId) => {
    try {
      console.log("Loading konsentrasi for prodi:", prodiId);
      
      // Menggunakan parameter yang benar sesuai Swagger: prodiId
      const endpoint = `${API_LINK}DropOut/konsentrasi?prodiId=${prodiId}`;
      
      console.log("Fetching konsentrasi from:", endpoint);
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Raw konsentrasi data:", data);

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

      console.log("Normalized konsentrasi data:", normalized);
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
      console.log("Loading mahasiswa for konsentrasi:", konsId);
      const endpoint = `${API_LINK}DropOut/mahasiswa-by-konsentrasi?konsentrasiId=${konsId}`;
      console.log("Mahasiswa endpoint:", endpoint);
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Mahasiswa response status:", res.status);
      console.log("Mahasiswa response ok:", res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Mahasiswa error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Raw mahasiswa data length:", data.length);
      console.log("Raw mahasiswa data sample:", data.slice(0, 3));

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
        Value: x.Value ?? x.value ?? x.mhs_id ?? x.id ?? "",
        Text: x.Text ?? x.text ?? x.mhs_nama ?? x.nama ?? x.name ?? ""
      }));

      console.log("Normalized mahasiswa data length:", normalized.length);
      console.log("Normalized mahasiswa sample:", normalized.slice(0, 3));
      setMahasiswaList(normalized);

      if (!normalized.length) {
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
      console.log("Loading angkatan for mahasiswa:", mhsId);
      const endpoint = `${API_LINK}DropOut/angkatan-by-mahasiswa?mhsId=${mhsId}`;
      console.log("Angkatan endpoint:", endpoint);
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Angkatan response status:", res.status);
      console.log("Angkatan response ok:", res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Angkatan error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Raw angkatan data:", data);

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

      console.log("Angkatan mahasiswa:", angkatan);
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
    console.log("User selected konsentrasi:", val);
    setSelectedKonsentrasi(val);
    setSelectedMhs("");
    setAngkatanMahasiswa(""); // Reset angkatan
    setMahasiswaList([]);
    
    if (val) {
      console.log("Loading mahasiswa for konsentrasi ID:", val);
      loadMahasiswaByKonsentrasi(val);
    } else {
      console.log("No konsentrasi selected, clearing mahasiswa list");
    }
  };

  const handleSelectMhs = (val) => {
    console.log("User selected mahasiswa:", val);
    setSelectedMhs(val);
    setAngkatanMahasiswa(""); // Reset angkatan
    setShowProfilModal(false); // Close modal if open
    
    if (val) {
      console.log("Loading angkatan for mahasiswa ID:", val);
      loadAngkatanByMahasiswa(val);
    } else {
      console.log("No mahasiswa selected, clearing angkatan");
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

    const payload = {
      mhsId: selectedMhs,
      prodiId: selectedProdi,
      konsentrasiId: selectedKonsentrasi,
      angkatan: angkatanMahasiswa,
      menimbang: formData.menimbang,
      mengingat: formData.mengingat,
      lampiran: "",
      lampiranSuratPengajuan: ""
    };

    try {
      const res = await fetch(`${API_LINK}DropOut/create-pengajuan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        Toast.error(data?.message || "Gagal membuat pengajuan Drop Out");
        return;
      }

      Toast.success("Pengajuan Drop Out berhasil dibuat");
      router.push(`/pages/administrasi/drop-out/detail/${data.id}`);
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
              isDisabled={userData?.role?.toUpperCase() === "PRODI" || isLoading}
              isRequired={true}
            />
            {isLoading && (
              <div className="text-muted small">Memuat data program studi...</div>
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
                  onClick={() => setShowProfilModal(true)}
                >
                  <i className="bi bi-eye me-2"></i>
                  Lihat Profil Mahasiswa
                </button>
              ) : (
                <span className="text-muted d-flex align-items-center small">
                  <i className="bi bi-eye-slash me-2"></i>
                  Pilih mahasiswa untuk melihat profil
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

      {/* Modal Profil Mahasiswa */}
      <ProfilMahasiswaModal
        isOpen={showProfilModal}
        onClose={() => setShowProfilModal(false)}
        mhsId={selectedMhs}
      />
    </MainContent>
  );
}

