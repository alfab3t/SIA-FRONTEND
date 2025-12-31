"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getUserData, getSSOData } from "@/context/user";
import { useRouter, useParams } from "next/navigation";
import fetchData from "@/lib/fetch";

export default function Page_Edit_DropOut() {
  const router = useRouter();
  const params = useParams();
  const userData = useMemo(() => getUserData(), []);
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
  const [showProfilModal, setShowProfilModal] = useState(false);
  
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
          menimbang: response.menimbang || "",
          mengingat: response.mengingat || "",
        });
        
        // Set mhsId dan angkatan langsung
        if (response.mhsId) {
          setSelectedMhs(response.mhsId);
        }
        if (response.angkatan) {
          setAngkatanMahasiswa(response.angkatan);
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
        const res = await fetch(`${API_LINK}DropOut/prodi`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
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
        const endpoint = `${API_LINK}DropOut/konsentrasi?prodiId=${selectedProdi}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
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
        const endpoint = `${API_LINK}DropOut/mahasiswa-by-konsentrasi?konsentrasiId=${selectedKonsentrasi}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        let dataArray = Array.isArray(data) ? data : (data.data || data.result || []);

        const normalized = dataArray.map((x) => ({
          Value: x.Value ?? x.value ?? x.mhs_id ?? x.id ?? "",
          Text: x.Text ?? x.text ?? x.mhs_nama ?? x.nama ?? x.name ?? ""
        }));

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
      const endpoint = `${API_LINK}DropOut/angkatan-by-mahasiswa?mhsId=${mhsId}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
    setShowProfilModal(false);
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
      id: id,
      mhsId: selectedMhs,
      menimbang: formData.menimbang,
      mengingat: formData.mengingat,
      lampiran: "",
      lampiranSuratPengajuan: ""
    };

    try {
      const res = await fetch(`${API_LINK}DropOut/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        Toast.error(data?.message || "Gagal menyimpan perubahan");
        return;
      }

      Toast.success("Perubahan berhasil disimpan");
      router.push(`/pages/Page_Administrasi_Pengajuan_Drop_Out`);
    } catch (err) {
      console.error("Submit error:", err);
      Toast.error("Terjadi kesalahan server");
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
        { label: "Drop Out", href: "/pages/Page_Administrasi_Pengajuan_Drop_Out" },
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

      {/* Modal Profil Mahasiswa */}
      <ProfilMahasiswaModal
        isOpen={showProfilModal}
        onClose={() => setShowProfilModal(false)}
        mhsId={selectedMhs}
      />
    </MainContent>
  );
}
