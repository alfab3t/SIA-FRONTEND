"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { getUserData, getSSOData } from "@/context/user";
import { useRouter, useParams } from "next/navigation";
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

export default function Page_Edit_DropOut() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);

  const [prodiList, setProdiList] = useState([]);
  const [konsentrasiList, setKonsentrasiList] = useState([]);
  const [mahasiswaList, setMahasiswaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);

  const [selectedProdi, setSelectedProdi] = useState("");
  const [selectedKonsentrasi, setSelectedKonsentrasi] = useState("");
  const [selectedMhs, setSelectedMhs] = useState("");
  const [angkatanMahasiswa, setAngkatanMahasiswa] = useState("");
  
  // Store original data for matching
  const editDataRef = useRef(null);

  const [formData, setFormData] = useState({
    menimbang: "",
    mengingat: "",
  });
  const [errors, setErrors] = useState({});
  
  const placeholderText = {
    menimbang: "Contoh: Bahwa mahasiswa yang bersangkutan tidak mengikuti perkuliahan tanpa pemberitahuan selama 2 (dua) minggu berturut-turut.",
    mengingat: "Contoh: Buku Pedoman Mahasiswa tahun 2014 Pasal 61 ayat 3 point b mengenai pencabutan hak mengikuti perkuliahan (DO)."
  };


  // Load detail data saat pertama kali
  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }
    loadDetailData();
  }, [params.id]);

  const loadDetailData = async () => {
    try {
      setIsLoadingDetail(true);
      const id = decodeURIComponent(params.id);
      
      const response = await fetchData(
        API_LINK + `DropOut/detail`,
        { id: id },
        "GET"
      );

      console.log("Detail response:", response);

      if (response) {
        // Store original data
        editDataRef.current = response;
        
        // Set form data dari response
        setFormData({
          menimbang: response.menimbang || response.lampiran || "",
          mengingat: response.mengingat || response.lampiranSuratPengajuan || "",
        });
        
        // Set mhsId dan angkatan langsung
        if (response.mhsId) {
          setSelectedMhs(response.mhsId);
        }
        if (response.angkatan) {
          setAngkatanMahasiswa(response.angkatan);
        }
        
        // Jika ada prodiId langsung, set
        if (response.prodiId) {
          setSelectedProdi(response.prodiId);
        }
        
        // Jika ada konsentrasiId langsung, set
        if (response.konsentrasiId) {
          setSelectedKonsentrasi(response.konsentrasiId);
        }
      }
    } catch (err) {
      console.error("Load detail error:", err);
      Toast.error("Gagal memuat data: " + err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Load Program Studi setelah detail selesai
  useEffect(() => {
    if (isLoadingDetail) return;
    
    const loadProdi = async () => {
      setIsLoading(true);
      try {
        // Get JWT token from cookie
        const jwtToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('jwtToken='))
          ?.split('=')[1];
        
        const res = await fetch(`${API_LINK}DropOut/prodi`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
          },
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const raw = await res.json();
        let dataArray = Array.isArray(raw) ? raw : (raw.data || raw.result || []);

        const normalized = dataArray.map((item) => ({
          Value: item.Value ?? item.value ?? item.pro_id ?? item.id ?? "",
          Text: item.Text ?? item.text ?? item.pro_nama ?? item.nama ?? item.name ?? ""
        }));

        console.log("Prodi list:", normalized);
        console.log("Edit data prodi:", editDataRef.current?.prodi);
        
        setProdiList(normalized);
        
        // Match prodi dari data edit
        if (editDataRef.current?.prodi) {
          const prodiName = editDataRef.current.prodi;
          // Cari prodi yang cocok berdasarkan nama (bisa partial match)
          const matchedProdi = normalized.find(p => 
            p.Text === prodiName || 
            p.Text.includes(prodiName) ||
            prodiName.includes(p.Text)
          );
          
          console.log("Matched prodi:", matchedProdi);
          
          if (matchedProdi) {
            setSelectedProdi(matchedProdi.Value);
          }
        }
      } catch (err) {
        console.error("Error loading prodi:", err);
        Toast.error("Gagal memuat program studi: " + err.message);
        setProdiList([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProdi();
  }, [isLoadingDetail]);

  // Load Konsentrasi ketika prodi dipilih
  useEffect(() => {
    if (!selectedProdi) return;
    
    const loadKons = async () => {
      try {
        // Get JWT token from cookie
        const jwtToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('jwtToken='))
          ?.split('=')[1];
        
        const endpoint = `${API_LINK}DropOut/konsentrasi?prodiId=${selectedProdi}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
          },
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        let dataArray = Array.isArray(data) ? data : (data.data || data.result || []);

        const normalized = dataArray.map((x) => ({
          Value: x.Value ?? x.value ?? x.kon_id ?? x.id ?? "",
          Text: x.Text ?? x.text ?? x.kon_nama ?? x.nama ?? x.name ?? ""
        }));

        console.log("Konsentrasi list:", normalized);
        console.log("Edit data konsentrasi:", editDataRef.current?.konsentrasi);
        
        setKonsentrasiList(normalized);
        
        // Match konsentrasi dari data edit
        if (editDataRef.current?.konsentrasi) {
          const konsName = editDataRef.current.konsentrasi;
          const matchedKons = normalized.find(k => 
            k.Text === konsName || 
            k.Text.includes(konsName) ||
            konsName.includes(k.Text)
          );
          
          console.log("Matched konsentrasi:", matchedKons);
          
          if (matchedKons) {
            setSelectedKonsentrasi(matchedKons.Value);
          }
        }
      } catch (err) {
        console.error("Error loading konsentrasi:", err);
        setKonsentrasiList([]);
      }
    };
    
    loadKons();
  }, [selectedProdi]);

  // Load Mahasiswa ketika konsentrasi dipilih
  useEffect(() => {
    if (!selectedKonsentrasi) return;
    
    const loadMhs = async () => {
      try {
        // Get JWT token from cookie
        const jwtToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('jwtToken='))
          ?.split('=')[1];
        
        const endpoint = `${API_LINK}DropOut/mahasiswa-by-konsentrasi?konsentrasiId=${selectedKonsentrasi}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
          },
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        let dataArray = Array.isArray(data) ? data : (data.data || data.result || []);

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

        console.log("Mahasiswa list:", normalized);
        console.log("Edit data mhsId:", editDataRef.current?.mhsId);
        
        setMahasiswaList(normalized);
        
        // Set selected mahasiswa dari data edit jika ada
        if (editDataRef.current?.mhsId) {
          setSelectedMhs(editDataRef.current.mhsId);
        }
      } catch (err) {
        console.error("Error loading mahasiswa:", err);
        setMahasiswaList([]);
      }
    };
    
    loadMhs();
  }, [selectedKonsentrasi]);

  // Load Angkatan by Mahasiswa
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
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      let angkatan = typeof data === 'string' ? data : (data.angkatan || data.value || data.result || "");
      setAngkatanMahasiswa(angkatan);
    } catch (err) {
      console.error("Error loading angkatan:", err);
      setAngkatanMahasiswa("");
    }
  };


  // Handle Select - untuk perubahan manual oleh user
  const handleSelectProdi = (val) => {
    // Clear ref data agar tidak auto-select lagi
    if (editDataRef.current) {
      editDataRef.current = { ...editDataRef.current, prodi: null, konsentrasi: null, mhsId: null };
    }
    setSelectedProdi(val);
    setSelectedKonsentrasi("");
    setSelectedMhs("");
    setAngkatanMahasiswa("");
    setKonsentrasiList([]);
    setMahasiswaList([]);
  };

  const handleSelectKonsentrasi = (val) => {
    // Clear ref data agar tidak auto-select lagi
    if (editDataRef.current) {
      editDataRef.current = { ...editDataRef.current, konsentrasi: null, mhsId: null };
    }
    setSelectedKonsentrasi(val);
    setSelectedMhs("");
    setAngkatanMahasiswa("");
    setMahasiswaList([]);
  };

  const handleSelectMhs = (val) => {
    setSelectedMhs(val);
    setAngkatanMahasiswa("");
    if (val) loadAngkatanByMahasiswa(val);
  };

  const handleEditorChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  // Submit Update
  const handleSubmit = async () => {
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

    const confirm = await SweetAlert({
      title: "Simpan Perubahan",
      text: "Apakah Anda yakin ingin menyimpan perubahan?",
      icon: "info",
      confirmText: "Ya, Simpan!",
      confirmButtonColor: "#1e88e5",
    });

    if (!confirm) return;

    const id = decodeURIComponent(params.id);
    const payload = {
      menimbang: formData.menimbang,
      mengingat: formData.mengingat
    };

    console.log("Edit payload:", payload);
    console.log("Edit ID:", id);

    try {
      // Get JWT token from cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const res = await fetch(`${API_LINK}DropOut/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(payload)
      });

      console.log("Response status:", res.status);
      
      // Cek apakah response adalah JSON
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType?.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        Toast.error("Server mengembalikan response yang tidak valid");
        return;
      }

      if (!res.ok) {
        Toast.error(data?.message || `Gagal menyimpan perubahan (${res.status})`);
        return;
      }

      Toast.success("Perubahan berhasil disimpan");
      router.push(`/pages/administrasi-akademik/drop-out`);
    } catch (err) {
      console.error("Submit error:", err);
      Toast.error("Terjadi kesalahan: " + err.message);
    }
  };

  if (isLoadingDetail) {
    return (
      <MainContent layout="Admin" loading={true} title="Edit Pengajuan Drop Out">
        <div></div>
      </MainContent>
    );
  }


  return (
    <MainContent
      layout="Admin"
      title="Edit Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out", href: "/pages/administrasi-akademik/Page_Administrasi_Pengajuan_Drop_Out" },
        { label: "Edit" }
      ]}
    >
      <Card title="Edit Pengajuan Drop Out">
        {/* Row 1: Dropdown Selection */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <DropDown
              label="Program Studi"
              forInput="ddProdi"
              arrData={isLoading ? [] : prodiList}
              value={selectedProdi}
              onChange={(e) => handleSelectProdi(e.target.value)}
              isDisabled={true}
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
              isDisabled={true}
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
              isDisabled={true}
              isRequired={true}
              placeholder="-- Pilih Mahasiswa --"
            />
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
              {selectedMhs && (
                <span className="text-muted d-flex align-items-center small">
                  <i className="bi bi-person-check me-2" /> Mahasiswa terpilih
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Editor Section */}
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
              editorKey={`menimbang-${formData.menimbang ? 'loaded' : 'empty'}`}
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
              editorKey={`mengingat-${formData.mengingat ? 'loaded' : 'empty'}`}
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
            label="Simpan Perubahan"
            onClick={handleSubmit}
            iconName="floppy"
          />
        </div>
      </Card>
    </MainContent>
  );
}
