"use client";
import { useState, useEffect, useMemo, useRef } from "react";
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
import Loading from "@/components/common/Loading";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";
import { useRouter } from "next/navigation";
import { encryptIdUrl } from "@/lib/encryptor";
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
  const [formData, setFormData] = useState({
    menimbang: "",
    mengingat: "",
  });
  const [errors, setErrors] = useState({});
  const [existingSubmissions, setExistingSubmissions] = useState([]);
  const placeholderText = {
    menimbang: "Contoh: Bahwa mahasiswa yang bersangkutan tidak mengikuti perkuliahan tanpa pemberitahuan selama 2 (dua) minggu berturut-turut.",
    mengingat: "Contoh: Buku Pedoman Mahasiswa tahun 2014 Pasal 61 ayat 3 point b mengenai pencabutan hak mengikuti perkuliahan (DO)."
  };
  useEffect(() => {
    const loadProdi = async () => {
      setIsLoading(true);
      try {
        const jwtToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('jwtToken='))
          ?.split('=')[1];
        const roleId = userData?.roleId || "";
        const isProdiByRole = roleId === "ROL71";
        const hasProdiId = !!(userData?.prodiId || userData?.kodeProdi);
        const isProdi = isProdiByRole || hasProdiId;
        const endpoint = isProdi 
          ? `${API_LINK}DropOut/prodi`
          : `${API_LINK}DropOut/prodi/list`;
        
        // Fetch prodi dan semua pengajuan aktif (bukan Ditolak dan Disetujui)
        const [prodiRes, draftRes, belumWadirRes, belumDirekturRes] = await Promise.all([
          fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
            },
          }),
          fetch(`${API_LINK}DropOut?status=Draft`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
            },
          }).catch(() => ({ ok: false })),
          fetch(`${API_LINK}DropOut?status=Belum Disetujui Wadir 1`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
            },
          }).catch(() => ({ ok: false })),
          fetch(`${API_LINK}DropOut?status=Belum Disetujui Direktur`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
            },
          }).catch(() => ({ ok: false }))
        ]);
        
        if (!prodiRes.ok) {
          throw new Error(`HTTP error! status: ${prodiRes.status}`);
        }
        const raw = await prodiRes.json();
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
        
        // Gabungkan semua pengajuan aktif
        const extractSubmissions = async (response) => {
          if (!response.ok) return [];
          try {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
          } catch {
            return [];
          }
        };
        
        const [draftData, belumWadirData, belumDirekturData] = await Promise.all([
          extractSubmissions(draftRes),
          extractSubmissions(belumWadirRes),
          extractSubmissions(belumDirekturRes)
        ]);
        
        const allActiveSubmissions = [...draftData, ...belumWadirData, ...belumDirekturData];
        setExistingSubmissions(allActiveSubmissions);
        
        if (normalized.length === 0) {
          Toast.info("Tidak ada data program studi yang tersedia");
        }
      } catch (err) {
        Toast.error("Gagal memuat program studi. Silakan coba lagi.");
        setProdiList([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (API_LINK) {
      loadProdi();
    } else {
      Toast.error("Konfigurasi API tidak ditemukan");
      setProdiList([]);
      setIsLoading(false);
    }
  }, [userData]);
  useEffect(() => {
    if (!userData || prodiList.length === 0) return;
    const roleId = userData?.roleId || "";
    const isProdiByRole = roleId === "ROL71";
    const hasProdiId = !!(userData?.prodiId || userData?.kodeProdi);
    const isProdi = isProdiByRole || hasProdiId;
    if (isProdi && prodiList.length > 0 && !selectedProdi) {
      const firstProdi = prodiList[0].Value;
      setSelectedProdi(firstProdi);
      loadKonsentrasi(firstProdi);
    }
  }, [userData, prodiList, selectedProdi]);
  const loadKonsentrasi = async (prodiId) => {
    try {
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
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
      setKonsentrasiList([]);
      if (err.message.includes("400")) {
        Toast.error("Data konsentrasi belum tersedia untuk prodi ini");
      } else {
        Toast.error("Gagal memuat konsentrasi. Silakan coba lagi.");
      }
    }
  };
  const loadMahasiswaByKonsentrasi = async (konsId) => {
    try {
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
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        dataArray = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        dataArray = data.result;
      }
      const normalized = dataArray.map((x) => {
        let originalText = x.Text ?? x.text ?? x.mhs_nama ?? x.nama ?? x.name ?? "";
        const nim = x.Value ?? x.value ?? x.mhs_id ?? x.id ?? "";
        
        // Cek apakah text sudah mengandung NIM di awal
        let displayText = originalText;
        if (originalText && !originalText.startsWith(nim)) {
          // Jika belum ada NIM, tambahkan
          displayText = `${nim} - ${originalText}`;
        }
        
        return {
          Value: nim,
          Text: displayText
        };
      });
      setMahasiswaList(normalized);
      if (normalized.length === 0) {
        Toast.info("Tidak ada mahasiswa aktif pada konsentrasi ini.");
      }
    } catch (err) {
      setMahasiswaList([]);
      Toast.error("Gagal memuat daftar mahasiswa. Silakan coba lagi.");
    }
  };
  const loadAngkatanByMahasiswa = async (mhsId) => {
    try {
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
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
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
      setAngkatanMahasiswa("");
      Toast.error("Gagal memuat angkatan mahasiswa. Silakan coba lagi.");
    }
  };
  const checkBebasTanggungan = async (mhsId) => {
    try {
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
        return { isBebas: false, message: "Gagal memeriksa status tanggungan" };
      }
      const data = await res.json();
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
      console.error("Error checking tanggungan status:", err);
      return { isBebas: false, message: "Gagal memeriksa status tanggungan" };
    }
  };
  const handleSelectProdi = (val) => {
    setSelectedProdi(val);
    setSelectedKonsentrasi("");
    setSelectedMhs("");
    setAngkatanMahasiswa(""); 
    setKonsentrasiList([]);
    setMahasiswaList([]);
    setErrors(prev => ({ ...prev, prodi: null }));
    loadKonsentrasi(val);
  };
  const handleSelectKonsentrasi = (val) => {
    setSelectedKonsentrasi(val);
    setSelectedMhs("");
    setAngkatanMahasiswa(""); 
    setMahasiswaList([]);
    setErrors(prev => ({ ...prev, konsentrasi: null }));
    if (val) {
      loadMahasiswaByKonsentrasi(val);
    }
  };
  const handleSelectMhs = (val) => {
    setSelectedMhs(val);
    setAngkatanMahasiswa(""); 
    setErrors(prev => ({ ...prev, mahasiswa: null }));
    if (val) {
      loadAngkatanByMahasiswa(val);
    }
  };
  const handleEditorChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };
  const handleSubmit = async () => {
    const newErrors = {};
    if (!selectedProdi) newErrors.prodi = "Program studi wajib dipilih";
    if (!selectedKonsentrasi) newErrors.konsentrasi = "Konsentrasi wajib dipilih";
    if (!selectedMhs) newErrors.mahasiswa = "Mahasiswa wajib dipilih";
    if (!formData.menimbang?.trim() || formData.menimbang === '<p><br></p>') {
      newErrors.menimbang = "Bagian Menimbang wajib diisi";
    }
    if (!formData.mengingat?.trim() || formData.mengingat === '<p><br></p>') {
      newErrors.mengingat = "Bagian Mengingat wajib diisi";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Toast.error("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    // Validasi apakah mahasiswa sudah memiliki pengajuan aktif (bukan Ditolak)
    const existingSubmission = existingSubmissions.find(sub => {
      const subMhsId = sub.mhsId || sub.nim || sub.id;
      const subStatus = (sub.status || sub.dro_status || "").toLowerCase();
      return subMhsId === selectedMhs && !subStatus.includes("ditolak");
    });
    
    if (existingSubmission) {
      const statusPengajuan = existingSubmission.status || existingSubmission.dro_status || "aktif";
      Toast.error(
        `Mahasiswa ini sudah memiliki pengajuan dengan status "${statusPengajuan}". ` +
        `Pengajuan baru hanya dapat dibuat jika status pengajuan sebelumnya "Ditolak".`
      );
      return;
    }

    const result = await checkBebasTanggungan(selectedMhs);
    if (!result.isBebas) {
      Toast.error("Tidak dapat mengajukan Drop Out. Mahasiswa masih memiliki tanggungan.");
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
      menimbang: formData.menimbang || "",
      mengingat: formData.mengingat || "",
      lampiran: "",
      lampiranSuratPengajuan: "",
      createdBy: userData?.username || ""
    };
    
    try {
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const res = await fetch(`${API_LINK}DropOut/create-pengajuan`, {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await res.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        data = { error: true, message: responseText };
      }
      
      if (!res.ok) {
        Toast.error(data?.message || `Gagal membuat pengajuan Drop Out (${res.status})`);
        return;
      }
      
      Toast.success("Pengajuan Drop Out berhasil dibuat sebagai draft");
      
      // Redirect ke halaman utama
      router.push(`/pages/administrasi-akademik/drop-out`);
      
      // Tunggu sebentar untuk memastikan redirect selesai, lalu reload
      setTimeout(() => {
        if (globalThis.location.pathname === "/pages/administrasi-akademik/drop-out") {
          globalThis.location.reload();
        }
      }, 500);
      
    } catch (err) {
      console.error("Error creating drop out submission:", err);
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
      {/* Loading overlay saat fetch data */}
      <Loading loading={isLoading} message="Memuat data..." />
      
      <Card title="Tambah Pengajuan Drop Out">
        {}
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
            {errors.prodi && (
              <div className="text-danger small mt-1">
                <i className="bi bi-exclamation-circle me-1" />
                {errors.prodi}
              </div>
            )}
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
            {errors.konsentrasi && (
              <div className="text-danger small mt-1">
                <i className="bi bi-exclamation-circle me-1" />
                {errors.konsentrasi}
              </div>
            )}
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
            {errors.mahasiswa && (
              <div className="text-danger small mt-1">
                <i className="bi bi-exclamation-circle me-1" />
                {errors.mahasiswa}
              </div>
            )}
            {selectedKonsentrasi && mahasiswaList.length === 0 && (
              <div className="text-muted small">Memuat data mahasiswa...</div>
            )}
          </div>
        </div>
        {}
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
                  onClick={() => window.open(`/pages/persiapan-perkuliahan/mahasiswa/detail/${encryptIdUrl(selectedMhs)}`, '_blank')}
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
        {}
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
              editorKey="menimbang-editor"
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
              editorKey="mengingat-editor"
            />
          </div>
        </div>
        {}
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
