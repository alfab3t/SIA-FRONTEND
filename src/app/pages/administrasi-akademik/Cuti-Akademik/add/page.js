"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import DropDown from "@/components/common/Dropdown";
import Label from "@/components/common/Label";
import { useRouter } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";

const Editor = dynamic(() => import("@/components/common/Editor"), {
  ssr: false,
  loading: () => (
    <div className="p-3 border rounded text-muted">Loading Editor...</div>
  ),
});

export default function AddCutiAkademik() {
  const router = useRouter();
  const userData = useMemo(() => getUserData(), []);

  // Determine user role
  const [permission, setPermission] = useState(null);
  
  useEffect(() => {
    const loadPermission = async () => {
      try {
        const payload = {
          username: userData?.username || "",
          appId: "SIA",
          roleId: userData?.roleId || ""
        };

        const res = await fetch(`${API_LINK}Auth/getpermission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        setPermission(data);
      } catch (err) {
        console.error("Gagal load permission:", err);
      }
    };

    if (userData?.username) loadPermission();
  }, [userData]);

  let fixedRole = (userData?.role || "").toUpperCase();
  if (permission?.roleName) {
    fixedRole = permission.roleName.toUpperCase();
  }
  
  const isProdi = fixedRole === "ROL22" || fixedRole === "PRODI" || fixedRole === "NDA-PRODI" || fixedRole === "NDA_PRODI";
  const isMahasiswa = fixedRole === "ROL23" || fixedRole === "MAHASISWA";

  const [saving, setSaving] = useState(false);
  const [prodiList, setProdiList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [loadingProdi, setLoadingProdi] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const prodiRef = useRef();
  const mahasiswaRef = useRef();
  const tahunAjaranRef = useRef();
  const semesterRef = useRef();

  const [formData, setFormData] = useState({
    // Common fields
    tahunAjaran: "",
    semester: "",
    suratPernyataan: null,
    lampiran: null,
    // Prodi-specific fields
    konId: "",
    mhsId: "",
    angkatan: "",
    menimbang: "",
  });

  const [errors, setErrors] = useState({});

  // State for bebas tanggungan check (for Prodi)
  const [bebasTanggunganStatus, setBebasTanggunganStatus] = useState(null);
  const [checkingBebasTanggungan, setCheckingBebasTanggungan] = useState(false);

  // Helper function to load students for a given konId
  const loadStudentsForKonId = useCallback(async (konId) => {
    if (!konId) {
      setStudentList([]);
      return;
    }

    setLoadingStudents(true);
    try {
      console.log(`[loadStudentsForKonId] Loading students for konId: ${konId}`);
      
      const response = await fetch(`${API_LINK}Mahasiswa/GetByKonsentrasi?konId=${konId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`[loadStudentsForKonId] Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[loadStudentsForKonId] Received ${data.length} students:`, data);
        
        const mappedStudents = data.map(item => {
          console.log(`[loadStudentsForKonId] Student: ${item.mhsNama}`, item);
          
          return {
            Value: item.mhsId,
            Text: item.mhsNama
          };
        });
        
        console.log(`[loadStudentsForKonId] Mapped students:`, mappedStudents);
        setStudentList(mappedStudents);
      } else {
        const errorText = await response.text();
        console.error(`[loadStudentsForKonId] API Error: ${response.status} - ${errorText}`);
        Toast.error("Gagal memuat daftar mahasiswa.");
        setStudentList([]);
      }
    } catch (error) {
      console.error("[loadStudentsForKonId] Network error:", error);
      Toast.error("Terjadi kesalahan saat memuat daftar mahasiswa.");
      setStudentList([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Load prodi list for prodi users based on their username
  useEffect(() => {
    // Use userData.nama as username since that's where the username is stored
    const username = userData?.username || userData?.nama;
    
    console.log("[loadProdi useEffect] isProdi:", isProdi);
    console.log("[loadProdi useEffect] userData:", userData);
    console.log("[loadProdi useEffect] userData.username:", userData?.username);
    console.log("[loadProdi useEffect] userData.nama:", userData?.nama);
    console.log("[loadProdi useEffect] Final username to use:", username);
    
    if (!isProdi || !username) {
      console.log("[loadProdi useEffect] Skipping - isProdi:", isProdi, "username:", username);
      return;
    }
    
    const loadProdi = async () => {
      setLoadingProdi(true);
      try {
        console.log(`[loadProdi] Loading konsentrasi for username: ${username}`);
        
        const response = await fetch(`${API_LINK}Mahasiswa/GetKonsentrasiList?username=${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`[loadProdi] Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[loadProdi] Received konsentrasi data:`, data);
          
          const mappedProdi = data.map(item => ({
            Value: item.id,
            Text: item.nama
          }));
          
          console.log(`[loadProdi] Mapped prodi list:`, mappedProdi);
          setProdiList(mappedProdi);
          
          // Auto-select if only one prodi available
          if (mappedProdi.length === 1) {
            console.log(`[loadProdi] Auto-selecting single prodi: ${mappedProdi[0].Text}`);
            setFormData(prev => ({
              ...prev,
              konId: mappedProdi[0].Value
            }));
            
            // Auto-load students for this prodi
            loadStudentsForKonId(mappedProdi[0].Value);
          }
        } else {
          const errorText = await response.text();
          console.error(`[loadProdi] API Error: ${response.status} - ${errorText}`);
          Toast.error("Gagal memuat daftar program studi.");
        }
      } catch (error) {
        console.error("[loadProdi] Network error:", error);
        Toast.error("Terjadi kesalahan saat memuat daftar program studi.");
      } finally {
        setLoadingProdi(false);
      }
    };

    loadProdi();
  }, [isProdi, userData?.username, userData?.nama, loadStudentsForKonId]);

  // Load mahasiswa data using GetDetail for mahasiswa users
  useEffect(() => {
    if (!isMahasiswa || !userData) return;
    
    const loadMahasiswaData = async () => {
      try {
        const mhsId = userData?.nama || userData?.mhsId || userData?.userid || userData?.username || "";
        console.log(`[loadMahasiswaData] Loading data for mhsId: ${mhsId}`);
        console.log(`[loadMahasiswaData] userData:`, userData);
        
        if (!mhsId) {
          console.warn("[loadMahasiswaData] No mhsId found in userData");
          return;
        }

        const response = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${mhsId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`[loadMahasiswaData] Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[loadMahasiswaData] Data received:`, data);
          console.log(`[loadMahasiswaData] mhsAngkatan: ${data.mhsAngkatan}`);
          
          // Auto-populate form data for mahasiswa (only angkatan for internal use)
          setFormData(prev => ({
            ...prev,
            mhsId: mhsId,
            angkatan: data.mhsAngkatan?.toString() || ""
          }));
          
          console.log(`[loadMahasiswaData] Auto-populated angkatan: ${data.mhsAngkatan} for mahasiswa`);
        } else {
          const errorText = await response.text();
          console.error(`[loadMahasiswaData] API Error: ${response.status} - ${errorText}`);
          Toast.error("Gagal memuat data mahasiswa. Pastikan Anda login dengan akun yang benar.");
        }
      } catch (error) {
        console.error("[loadMahasiswaData] Network error:", error);
        Toast.error("Terjadi kesalahan saat memuat data mahasiswa.");
      }
    };

    loadMahasiswaData();
  }, [isMahasiswa, userData]);

  // Load students when prodi is selected (for prodi users)
  const handleProdiChange = async (e) => {
    const konId = e.target.value;
    setFormData(prev => ({
      ...prev,
      konId: konId,
      mhsId: "",
      angkatan: ""
    }));

    await loadStudentsForKonId(konId);
  };

  // Handle student selection - auto populate angkatan (for prodi users)
  const handleStudentChange = async (e) => {
    const mhsId = e.target.value;
    console.log(`[handleStudentChange] Selected mhsId: ${mhsId}`);
    
    // Set mhsId first
    setFormData(prev => ({
      ...prev,
      mhsId: mhsId,
      angkatan: "" // Reset angkatan while loading
    }));

    // Reset bebas tanggungan status
    setBebasTanggunganStatus(null);

    if (!mhsId) {
      return;
    }

    try {
      // Check bebas tanggungan for selected student (Prodi only)
      if (isProdi) {
        setCheckingBebasTanggungan(true);
        const btResponse = await fetch(`${API_LINK}Mahasiswa/CheckBebasTanggungan?userId=${mhsId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (btResponse.ok) {
          const btData = await btResponse.json();
          console.log(`[handleStudentChange] Bebas Tanggungan Status:`, btData);
          setBebasTanggunganStatus(btData.status);
        }
        setCheckingBebasTanggungan(false);
      }

      console.log(`[handleStudentChange] Fetching detail for mhsId: ${mhsId}`);
      
      const response = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${mhsId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`[handleStudentChange] Detail response status: ${response.status}`);
      
      if (response.ok) {
        const detailData = await response.json();
        console.log(`[handleStudentChange] Detail data received:`, detailData);
        
        const angkatan = detailData.mhsAngkatan || "";
        console.log(`[handleStudentChange] Setting angkatan to: ${angkatan}`);
        
        setFormData(prev => ({
          ...prev,
          angkatan: angkatan.toString()
        }));
      } else {
        const errorText = await response.text();
        console.error(`[handleStudentChange] API Error: ${response.status} - ${errorText}`);
        Toast.error("Gagal memuat detail mahasiswa.");
      }
    } catch (error) {
      console.error("[handleStudentChange] Network error:", error);
      Toast.error("Terjadi kesalahan saat memuat detail mahasiswa.");
      setCheckingBebasTanggungan(false);
    }
  };

  // -------------------------------------------
  // INPUT HANDLER
  // -------------------------------------------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (files && files[0]) {
      const file = files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      // Validate file size
      if (file.size > maxSize) {
        Toast.error(`File ${file.name} terlalu besar. Maksimal 10MB.`);
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        Toast.error(`Format file ${file.name} tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG.`);
        e.target.value = ''; // Clear the input
        return;
      }
      
      console.log(`File ${name} selected:`, file.name, file.size, file.type);
      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error when user types/selects
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleEditorChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  // -------------------------------------------
  // VALIDASI
  // -------------------------------------------
  const validate = () => {
    const newErrors = {};
    
    if (isProdi) {
      // Prodi validation
      if (!formData.konId) newErrors.konId = "Program studi harus dipilih.";
      if (!formData.mhsId) newErrors.mhsId = "Mahasiswa harus dipilih.";
      if (!formData.menimbang || formData.menimbang.trim() === "" || formData.menimbang === "<p></p>") {
        newErrors.menimbang = "Menimbang/pertimbangan wajib diisi.";
      }
    }
    
    // Common validation
    if (!formData.tahunAjaran) newErrors.tahunAjaran = "Tahun akademik wajib diisi.";
    if (!formData.semester) newErrors.semester = "Semester wajib diisi.";
    if (!formData.suratPernyataan) newErrors.suratPernyataan = "Surat pernyataan wajib di-upload.";
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      Toast.error("Mohon lengkapi semua field yang wajib diisi.");
      return false;
    }
    
    return true;
  };

  // -------------------------------------------
  // SUBMIT
  // -------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);

    try {
      const fd = new FormData();
      
      if (isProdi) {
        // Prodi submission
        const approvalProdi = userData?.nama || userData?.username || userData?.userid || "";
        
        fd.append("MhsId", formData.mhsId);
        fd.append("TahunAjaran", formData.tahunAjaran);
        fd.append("Semester", formData.semester);
        
        // Ensure file is properly appended
        if (formData.suratPernyataan && formData.suratPernyataan instanceof File) {
          fd.append("LampiranSuratPengajuan", formData.suratPernyataan, formData.suratPernyataan.name);
          console.log("Surat Pernyataan file:", formData.suratPernyataan.name, formData.suratPernyataan.size);
        } else {
          console.error("Surat Pernyataan file is missing or invalid");
        }
        
        if (formData.lampiran && formData.lampiran instanceof File) {
          fd.append("Lampiran", formData.lampiran, formData.lampiran.name);
          console.log("Lampiran file:", formData.lampiran.name, formData.lampiran.size);
        }
        
        fd.append("Menimbang", formData.menimbang);
        fd.append("ApprovalProdi", approvalProdi);
        
        console.log("PRODI FORM DATA SEND =", {
          MhsId: formData.mhsId,
          TahunAjaran: formData.tahunAjaran,
          Semester: formData.semester,
          Menimbang: formData.menimbang,
          ApprovalProdi: approvalProdi,
          SuratPernyataanFile: formData.suratPernyataan?.name,
          LampiranFile: formData.lampiran?.name
        });
      } else {
        // Mahasiswa submission
        const mhsId = userData?.mhsId || userData?.nama || userData?.userid || userData?.username || "";
        
        console.log("=== MAHASISWA SUBMISSION MAPPING ===");
        console.log("userData.mhsId:", userData?.mhsId);
        console.log("userData.nama:", userData?.nama);
        console.log("userData.username:", userData?.username);
        console.log("userData.userid:", userData?.userid);
        console.log("Final mhsId for submission:", mhsId);
        
        if (!mhsId) {
          Toast.error("User tidak valid.");
          return;
        }
        
        fd.append("Step", "STEP1");
        fd.append("MhsId", mhsId);
        fd.append("TahunAjaran", formData.tahunAjaran);
        fd.append("Semester", formData.semester);
        
        // Ensure file is properly appended
        if (formData.suratPernyataan && formData.suratPernyataan instanceof File) {
          fd.append("LampiranSuratPengajuan", formData.suratPernyataan, formData.suratPernyataan.name);
          console.log("Surat Pernyataan file:", formData.suratPernyataan.name, formData.suratPernyataan.size);
        } else {
          console.error("Surat Pernyataan file is missing or invalid");
        }
        
        if (formData.lampiran && formData.lampiran instanceof File) {
          fd.append("Lampiran", formData.lampiran, formData.lampiran.name);
          console.log("Lampiran file:", formData.lampiran.name, formData.lampiran.size);
        }
        
        console.log("MAHASISWA FORM DATA SEND =", {
          MhsId: mhsId,
          TahunAjaran: formData.tahunAjaran,
          Semester: formData.semester,
          SuratPernyataanFile: formData.suratPernyataan?.name,
          LampiranFile: formData.lampiran?.name
        });
      }

      // Use appropriate endpoint
      const endpoint = isProdi 
        ? `${API_LINK}CutiAkademik/prodi/draft`
        : `${API_LINK}CutiAkademik/draft`;

      console.log("Submitting to endpoint:", endpoint);

      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
      });

      const raw = await res.text();
      console.log("RAW ADD RESPONSE =", raw);

      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        Toast.error("Server mengirim response tidak valid:\n\n" + raw);
        return;
      }

      if (result?.draftId) {
        if (isProdi) {
          // Mark this application as created by prodi in session storage
          const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedApps') || '[]');
          if (!prodiCreatedApps.includes(result.draftId)) {
            prodiCreatedApps.push(result.draftId);
            sessionStorage.setItem('prodiCreatedApps', JSON.stringify(prodiCreatedApps));
          }
          Toast.success("Pengajuan Cuti berhasil dibuat untuk mahasiswa.");
        } else {
          Toast.success("Pengajuan Cuti berhasil dibuat.");
        }
        router.push("/pages/administrasi-akademik/Cuti-Akademik");
      } else {
        Toast.error(result?.message || "Gagal membuat pengajuan.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      Toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => router.back();

  // State for dynamic tahun akademik data
  const [tahunAjaranData, setTahunAjaranData] = useState([]);

  // Generate tahun akademik based on angkatan
  const generateTahunAkademik = (angkatan) => {
    if (!angkatan) {
      console.log("[generateTahunAkademik] No angkatan provided, using default years");
      // Default years if no angkatan
      const currentYear = new Date().getFullYear();
      return [
        { Value: `${currentYear-1}/${currentYear}`, Text: `${currentYear-1}/${currentYear}` },
        { Value: `${currentYear}/${currentYear+1}`, Text: `${currentYear}/${currentYear+1}` },
        { Value: `${currentYear+1}/${currentYear+2}`, Text: `${currentYear+1}/${currentYear+2}` },
      ];
    }

    const tahunSekarang = new Date().getFullYear() - 1;
    const angkatanInt = parseInt(angkatan);
    const tahunAkademikList = [];

    console.log(`[generateTahunAkademik] Generating for angkatan: ${angkatanInt}, tahunSekarang: ${tahunSekarang}`);

    // Logic: for (int i = tahunSekarang; i <= angkatan + 3; i++) - matching old code
    for (let i = tahunSekarang; i <= angkatanInt + 3; i++) {
      const tahunAkademik = `${i}/${i + 1}`;
      tahunAkademikList.push({
        Value: tahunAkademik,
        Text: tahunAkademik
      });
      console.log(`[generateTahunAkademik] Added: ${tahunAkademik}`);
    }

    console.log(`[generateTahunAkademik] Generated ${tahunAkademikList.length} tahun akademik:`, tahunAkademikList);
    return tahunAkademikList;
  };

  // Update tahun akademik when angkatan changes
  useEffect(() => {
    if ((isProdi || isMahasiswa) && formData.angkatan) {
      console.log(`[useEffect] Angkatan changed to: ${formData.angkatan}, regenerating tahun akademik for ${isProdi ? 'Prodi' : 'Mahasiswa'}`);
      const newTahunAkademikData = generateTahunAkademik(formData.angkatan);
      setTahunAjaranData(newTahunAkademikData);
      
      // Reset tahun ajaran selection when angkatan changes
      setFormData(prev => ({
        ...prev,
        tahunAjaran: ""
      }));
    } else if (!isProdi && !isMahasiswa) {
      // For other users, use default years
      const defaultTahunAkademik = generateTahunAkademik(null);
      setTahunAjaranData(defaultTahunAkademik);
    }
  }, [formData.angkatan, isProdi, isMahasiswa]);

  // Initialize tahun akademik data on component mount for non-prodi and non-mahasiswa users
  useEffect(() => {
    if (!isProdi && !isMahasiswa) {
      console.log("[useEffect] Initializing tahun akademik for other user");
      const defaultTahunAkademik = generateTahunAkademik(null);
      setTahunAjaranData(defaultTahunAkademik);
    }
  }, [isProdi, isMahasiswa]);

  const semesterData = [
    { Value: "Ganjil", Text: "Ganjil" },
    { Value: "Genap", Text: "Genap" },
  ];

  return (
    <MainContent
      title={isProdi ? "Tambah Pengajuan Cuti Akademik (Prodi)" : isMahasiswa ? "Tambah Pengajuan Cuti Akademik (Mahasiswa)" : "Tambah Pengajuan Cuti Akademik"}
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: isProdi ? "Tambah Pengajuan (Prodi)" : "Tambah Pengajuan" },
      ]}
    >
      {/* Notifikasi Bebas Tanggungan untuk Prodi - di bawah breadcrumb */}
      {isProdi && formData.mhsId && bebasTanggunganStatus === "NOK" && (
        <div className="mb-3">
          <div className="alert alert-warning mb-2" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Mahasiswa belum menyelesaikan administrasi bebas tanggungan</strong>
          </div>
          <span 
            className="text-primary text-decoration-underline" 
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/pages/administrasi-akademik/bebas-tanggungan')}
          >
            <i className="fas fa-eye me-1"></i>
            Lihat Administrasi Bebas Tanggungan
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isProdi && (
          <>
            <div className="row mt-3">
              <div className="col-lg-4">
                <DropDown
                  ref={prodiRef}
                  forInput="konId"
                  label="Program Studi"
                  type="pilih"
                  arrData={prodiList}
                  value={formData.konId}
                  onChange={handleProdiChange}
                  isRequired={true}
                  isDisabled={loadingProdi}
                  errorMessage={errors.konId}
                  searchable={true}
                />
              </div>

              <div className="col-lg-4">
                <DropDown
                  ref={mahasiswaRef}
                  forInput="mhsId"
                  label="Mahasiswa"
                  type="pilih"
                  arrData={studentList}
                  value={formData.mhsId}
                  onChange={handleStudentChange}
                  isRequired={true}
                  isDisabled={!formData.konId || loadingStudents}
                  errorMessage={errors.mhsId}
                  searchable={true}
                />
              </div>
              <div className="col-lg-4">
                <Label
                  text="Angkatan"
                  htmlFor="angkatan"
                  required={false}
                />
                <input
                  type="text"
                  className="form-control rounded-4 blue-element"
                  value={formData.angkatan}
                  disabled
                  placeholder=""
                />
              </div>
            </div>
          </>
        )}

        <div className="row mt-3">
          <div className="col-lg-6">
            {(isProdi || isMahasiswa) ? (
              <DropDown
                ref={tahunAjaranRef}
                forInput="tahunAjaran"
                label="Tahun Akademik Mulai Cuti"
                type="pilih"
                arrData={tahunAjaranData}
                value={formData.tahunAjaran}
                onChange={handleChange}
                isRequired={true}
                errorMessage={errors.tahunAjaran}
                isDisabled={isMahasiswa && !formData.angkatan}
              />
            ) : (
              <>
                <Label
                  text="Tahun Akademik"
                  htmlFor="tahunAjaran"
                  required={true}
                />
                <select
                  name="tahunAjaran"
                  className="form-control rounded-4 blue-element"
                  onChange={handleChange}
                  value={formData.tahunAjaran}
                >
                  <option value="">— Pilih Tahun Akademik —</option>
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026</option>
                </select>
                {errors.tahunAjaran && (
                  <span className="fw-normal text-danger">{errors.tahunAjaran}</span>
                )}
              </>
            )}
            {isMahasiswa && !formData.angkatan && (
              <small className="text-muted">Memuat opsi tahun akademik...</small>
            )}
          </div>

          <div className="col-lg-6">
            {(isProdi || isMahasiswa) ? (
              <DropDown
                ref={semesterRef}
                forInput="semester"
                label="Semester Mulai Cuti"
                type="pilih"
                arrData={semesterData}
                value={formData.semester}
                onChange={handleChange}
                isRequired={true}
                errorMessage={errors.semester}
              />
            ) : (
              <>
                <Label
                  text="Semester"
                  htmlFor="semester"
                  required={true}
                />
                <select
                  name="semester"
                  className="form-control rounded-4 blue-element"
                  onChange={handleChange}
                  value={formData.semester}
                >
                  <option value="">— Pilih Semester —</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
                {errors.semester && (
                  <span className="fw-normal text-danger">{errors.semester}</span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-lg-6">
            <Label
              text={isProdi ? "Berkas Surat Pernyataan" : "Surat Pernyataan"}
              htmlFor="suratPernyataan"
              required={true}
            />
            <input
              type="file"
              name="suratPernyataan"
              className="form-control rounded-4 blue-element"
              onChange={handleChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {errors.suratPernyataan && (
              <span className="fw-normal text-danger">{errors.suratPernyataan}</span>
            )}
            <small className="text-muted">Format: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small>
          </div>

          <div className="col-lg-6">
            <Label
              text={isProdi ? "Berkas Lampiran" : "Lampiran"}
              htmlFor="lampiran"
              required={false}
            />
            <input
              type="file"
              name="lampiran"
              className="form-control rounded-4 blue-element"
              onChange={handleChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <small className="text-muted">Format: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small>
          </div>
        </div>

        {isProdi && (
          <div className="row mt-4">
            <div className="col-lg-12">
              <Editor
                label="Menimbang"
                name="menimbang"
                value={formData.menimbang}
                onChange={handleEditorChange}
                error={errors.menimbang}
              />
              <small className="text-muted">
                Masukkan pertimbangan/alasan untuk pengajuan cuti akademik mahasiswa.
              </small>
            </div>
          </div>
        )}

        <div className="d-flex justify-content-end mt-4 gap-2">
          <Button
            classType="secondary"
            label="Batal"
            type="button"
            onClick={handleCancel}
            isDisabled={saving}
          />
          {/* Hide Simpan button if Prodi selected student with tanggungan */}
          {!(isProdi && formData.mhsId && bebasTanggunganStatus === "NOK") && (
            <Button
              classType="primary"
              iconName="save"
              label={saving ? "Menyimpan..." : "Simpan Editor"}
              type="submit"
              isDisabled={saving}
            />
          )}
        </div>
      </form>
    </MainContent>
  );
}