"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import DropDown from "@/components/common/Dropdown";
import Label from "@/components/common/Label";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { decryptIdUrl } from "@/lib/encryptor";
import { getUserData } from "@/context/user";

const Editor = dynamic(() => import("@/components/common/Editor"), {
  ssr: false,
  loading: () => (
    <div className="p-3 border rounded text-muted">Loading Editor...</div>
  ),
});

export default function EditCutiAkademikPage() {
  const router = useRouter();
  const params = useParams();
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

  // ============================
  // REAL ID (cak_id)
  // ============================
  const realId = useMemo(() => {
    try {
      return decryptIdUrl(params?.id || "");
    } catch {
      return "";
    }
  }, [params]);

  const [loading, setLoading] = useState(true);
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
    oldSurat: "",
    oldLampiran: "",
    // Prodi-specific fields
    konId: "",
    mhsId: "",
    angkatan: "",
    menimbang: "",
    tahunAjaranOptions: [], // Dynamic options based on student's angkatan
  });

  const [errors, setErrors] = useState({});

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
  }, [isProdi, userData?.username, userData?.nama]);

  // Helper function to load students for a given konId
  const loadStudentsForKonId = async (konId) => {
    if (!konId) {
      setStudentList([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const response = await fetch(`${API_LINK}Mahasiswa/GetByKonsentrasi?konId=${konId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[loadStudentsForKonId] Received ${data.length} students:`, data);
        
        // Filter only active students (exclude inactive/graduated/dropped out students)
        const activeStudents = data.filter(item => {
          // Try multiple possible field names for status
          const status = (item.mhsStatusKuliah || 
                         item.statusKuliah || 
                         item.status || 
                         item.mhsStatus || 
                         "").toLowerCase().trim();
          
          // List of inactive status keywords
          const inactiveKeywords = [
            'lulus', 'graduated', 'drop', 'keluar', 'meninggal', 'died',
            'tidak aktif', 'nonaktif', 'inactive', 'cuti', 'leave',
            'putus studi', 'mengundurkan diri', 'resign'
          ];
          
          // Check if status contains any inactive keywords
          const isInactive = inactiveKeywords.some(keyword => 
            status.includes(keyword)
          );
          
          // Consider active if status doesn't contain inactive keywords
          // Allow empty status as it might mean active
          const isActive = !isInactive;
          
          console.log(`[loadStudentsForKonId] Student: ${item.mhsNama}, Status: "${status}", Active: ${isActive}`);
          return isActive;
        });
        
        console.log(`[loadStudentsForKonId] Filtered to ${activeStudents.length} active students from ${data.length} total`);
        
        setStudentList(activeStudents.map(item => ({
          Value: item.mhsId,
          Text: item.mhsNama
        })));
      } else {
        Toast.error("Gagal memuat daftar mahasiswa.");
        setStudentList([]);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      Toast.error("Terjadi kesalahan saat memuat daftar mahasiswa.");
      setStudentList([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Load students when prodi is selected (for prodi users)
  const handleProdiChange = async (e) => {
    const konId = e.target.value;
    setFormData(prev => ({
      ...prev,
      konId: konId,
      mhsId: "",
      angkatan: "",
      tahunAjaran: "", // Reset tahun ajaran when prodi changes
      tahunAjaranOptions: [] // Reset options
    }));

    await loadStudentsForKonId(konId);
  };

  // Handle student selection - auto populate angkatan and generate tahun akademik (for prodi users)
  const handleStudentChange = async (e) => {
    const mhsId = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      mhsId: mhsId,
      angkatan: "",
      tahunAjaran: "" // Reset tahun ajaran when student changes
    }));

    if (!mhsId) {
      return;
    }

    try {
      // Fetch student detail to get mhsAngkatan
      const response = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${mhsId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[handleStudentChange] Student detail:`, data);
        
        const angkatan = data.mhsAngkatan;
        if (angkatan) {
          // Generate tahun akademik options based on angkatan
          const tahunSekarang = new Date().getFullYear() - 1;
          const tahunAjaranOptions = [];
          
          for (let i = tahunSekarang; i <= angkatan + 3; i++) {
            tahunAjaranOptions.push({
              Value: `${i}/${i + 1}`,
              Text: `${i}/${i + 1}`
            });
          }
          
          console.log(`[handleStudentChange] Generated tahun akademik options:`, tahunAjaranOptions);
          
          setFormData(prev => ({
            ...prev,
            angkatan: angkatan.toString(),
            tahunAjaranOptions: tahunAjaranOptions
          }));
        }
      } else {
        console.error("Failed to fetch student detail");
        Toast.error("Gagal memuat detail mahasiswa.");
      }
    } catch (error) {
      console.error("Error fetching student detail:", error);
      Toast.error("Terjadi kesalahan saat memuat detail mahasiswa.");
    }
  };

  // ============================
  // HANDLE INPUT
  // ============================
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

  // ============================
  // LOAD DETAIL DARI API (FALLBACK)
  // ============================
  const loadDetailFromApi = useCallback(async () => {
    try {
      if (!realId) return;

      const url = `${API_LINK}CutiAkademik/detail?id=${encodeURIComponent(realId)}`;
      const res = await fetch(url);
      const raw = await res.text();

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (!data?.id) return;

      setFormData(prev => ({
        ...prev,
        tahunAjaran: data.tahunAjaran || "",
        semester: data.semester || "",
        oldSurat: data.lampiranSP || "",
        oldLampiran: data.lampiran || "",
        suratPernyataan: null,
        lampiran: null,
        // Prodi-specific fields
        mhsId: data.mhsId || "",
        menimbang: data.menimbang || "",
      }));

      // If we have mhsId and this is a prodi user, try to determine the prodi
      if (data.mhsId && isProdi) {
        const username = userData?.username || userData?.nama;
        console.log("Loading prodi data for student:", data.mhsId, "using username:", username);
        
        if (username) {
          // Get the user's konsentrasi list
          try {
            const konsentrasiResponse = await fetch(`${API_LINK}Mahasiswa/GetKonsentrasiList?username=${username}`);
            if (konsentrasiResponse.ok) {
              const konsentrasiData = await konsentrasiResponse.json();
              console.log("User's konsentrasi list:", konsentrasiData);
              
              // For each konsentrasi, check if this student belongs to it
              for (const konsentrasi of konsentrasiData) {
                const studentsResponse = await fetch(`${API_LINK}Mahasiswa/GetByKonsentrasi?konId=${konsentrasi.id}`);
                if (studentsResponse.ok) {
                  const students = await studentsResponse.json();
                  
                  // Filter only active students
                  const activeStudents = students.filter(item => {
                    const status = (item.mhsStatusKuliah || 
                                   item.statusKuliah || 
                                   item.status || 
                                   item.mhsStatus || 
                                   "").toLowerCase().trim();
                    
                    const inactiveKeywords = [
                      'lulus', 'graduated', 'drop', 'keluar', 'meninggal', 'died',
                      'tidak aktif', 'nonaktif', 'inactive', 'cuti', 'leave',
                      'putus studi', 'mengundurkan diri', 'resign'
                    ];
                    
                    const isInactive = inactiveKeywords.some(keyword => 
                      status.includes(keyword)
                    );
                    
                    return !isInactive;
                  });
                  
                  const studentFound = activeStudents.find(s => s.mhsId === data.mhsId);
                  if (studentFound) {
                    // Fetch student detail to get mhsAngkatan and generate tahun akademik
                    try {
                      const detailResponse = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${data.mhsId}`);
                      if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        const angkatan = detailData.mhsAngkatan;
                        
                        // Generate tahun akademik options based on angkatan
                        const tahunSekarang = new Date().getFullYear() - 1;
                        const tahunAjaranOptions = [];
                        
                        for (let i = tahunSekarang; i <= angkatan + 3; i++) {
                          tahunAjaranOptions.push({
                            Value: `${i}/${i + 1}`,
                            Text: `${i}/${i + 1}`
                          });
                        }
                        
                        // Found the konsentrasi for this student
                        setFormData(prev => ({
                          ...prev,
                          konId: konsentrasi.id,
                          angkatan: angkatan.toString(),
                          tahunAjaranOptions: tahunAjaranOptions
                        }));
                        
                        console.log("Generated tahun akademik options for existing data:", tahunAjaranOptions);
                      } else {
                        // Fallback if GetDetail fails
                        setFormData(prev => ({
                          ...prev,
                          konId: konsentrasi.id,
                          angkatan: studentFound.angkatan || ""
                        }));
                      }
                    } catch (detailError) {
                      console.warn("Could not fetch student detail:", detailError);
                      // Fallback if GetDetail fails
                      setFormData(prev => ({
                        ...prev,
                        konId: konsentrasi.id,
                        angkatan: studentFound.angkatan || ""
                      }));
                    }
                    
                    // Load students for this konsentrasi
                    setStudentList(activeStudents.map(item => ({
                      Value: item.mhsId,
                      Text: item.mhsNama
                    })));
                    
                    console.log("Found student's konsentrasi:", konsentrasi.nama);
                    break;
                  }
                }
              }
            }
          } catch (error) {
            console.warn("Could not determine student's konsentrasi:", error);
          }
        } else {
          console.warn("No username found for prodi user");
        }
      }

    } finally {
      setLoading(false);
    }
  }, [realId, isProdi, userData]);

  // Load mahasiswa data using GetDetail for mahasiswa users in edit mode
  useEffect(() => {
    if (!isMahasiswa || !userData || !realId) return;
    
    const loadMahasiswaDataForEdit = async () => {
      try {
        const mhsId = userData?.nama || userData?.mhsId || userData?.userid || userData?.username || "";
        console.log(`[loadMahasiswaDataForEdit] Loading data for mhsId: ${mhsId}`);
        
        if (!mhsId) {
          console.warn("[loadMahasiswaDataForEdit] No mhsId found in userData");
          return;
        }

        const response = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${mhsId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`[loadMahasiswaDataForEdit] Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[loadMahasiswaDataForEdit] Data received:`, data);
          console.log(`[loadMahasiswaDataForEdit] mhsAngkatan: ${data.mhsAngkatan}`);
          
          // Auto-populate angkatan for mahasiswa (internal use for tahun akademik generation)
          setFormData(prev => {
            const newFormData = {
              ...prev,
              angkatan: data.mhsAngkatan?.toString() || ""
            };
            console.log(`[loadMahasiswaDataForEdit] Setting formData.angkatan to: ${newFormData.angkatan}`);
            return newFormData;
          });
          
          console.log(`[loadMahasiswaDataForEdit] Auto-populated angkatan: ${data.mhsAngkatan} for mahasiswa edit`);
        } else {
          const errorText = await response.text();
          console.error(`[loadMahasiswaDataForEdit] API Error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error("[loadMahasiswaDataForEdit] Network error:", error);
      }
    };

    loadMahasiswaDataForEdit();
  }, [isMahasiswa, userData, realId]);

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
    console.log(`[generateTahunAkademik] Loop will run from ${tahunSekarang} to ${angkatanInt + 3} (inclusive)`);

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

  // State for dynamic tahun akademik data
  const [tahunAjaranData, setTahunAjaranData] = useState([]);

  // Update tahun akademik when angkatan changes
  useEffect(() => {
    if ((isProdi || isMahasiswa) && formData.angkatan) {
      console.log(`[useEffect] Angkatan changed to: ${formData.angkatan}, regenerating tahun akademik for ${isProdi ? 'Prodi' : 'Mahasiswa'} edit`);
      const newTahunAkademikData = generateTahunAkademik(formData.angkatan);
      setTahunAjaranData(newTahunAkademikData);
    } else if (!isProdi && !isMahasiswa) {
      // For other users, use default years
      const defaultTahunAkademik = generateTahunAkademik(null);
      setTahunAjaranData(defaultTahunAkademik);
    }
  }, [formData.angkatan, isProdi, isMahasiswa]);

  // Initialize tahun akademik data on component mount for non-prodi and non-mahasiswa users
  useEffect(() => {
    if (!isProdi && !isMahasiswa) {
      console.log("[useEffect] Initializing tahun akademik for other user in edit");
      const defaultTahunAkademik = generateTahunAkademik(null);
      setTahunAjaranData(defaultTahunAkademik);
    }
  }, [isProdi, isMahasiswa]);

  // ============================
  // INIT LOAD (SESSION FIRST)
  // ============================
  useEffect(() => {
    if (!realId) {
      Toast.error("ID tidak valid.");
      router.push("/pages/administrasi-akademik/Cuti-Akademik");
      return;
    }

    const cached = sessionStorage.getItem("editCutiDraft");

    if (cached) {
      const data = JSON.parse(cached);

      setFormData(prev => ({
        ...prev,
        tahunAjaran: data.tahunAjaran || "",
        semester: data.semester || "",
        oldSurat: data.lampiranSP || "",
        oldLampiran: data.lampiran || "",
        suratPernyataan: null,
        lampiran: null,
        // Prodi-specific fields
        mhsId: data.mhsId || "",
        menimbang: data.menimbang || "",
      }));

      setLoading(false);
    } else {
      loadDetailFromApi();
    }
  }, [realId, loadDetailFromApi, router]);

  // ============================
  // VALIDATION
  // ============================
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
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      Toast.error("Mohon lengkapi semua field yang wajib diisi.");
      return false;
    }
    
    return true;
  };

  // ============================
  // SUBMIT UPDATE
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);

    try {
      const fd = new FormData();

      fd.append("TahunAjaran", formData.tahunAjaran);
      fd.append("Semester", formData.semester);

      // 🔥 HARUS SESUAI DTO BE - Handle file uploads properly
      if (formData.suratPernyataan && formData.suratPernyataan instanceof File) {
        fd.append("LampiranSuratPengajuan", formData.suratPernyataan, formData.suratPernyataan.name);
        console.log("Updating Surat Pernyataan file:", formData.suratPernyataan.name, formData.suratPernyataan.size);
      }

      if (formData.lampiran && formData.lampiran instanceof File) {
        fd.append("Lampiran", formData.lampiran, formData.lampiran.name);
        console.log("Updating Lampiran file:", formData.lampiran.name, formData.lampiran.size);
      }

      if (isProdi) {
        // Prodi-specific fields
        fd.append("MhsId", formData.mhsId);
        fd.append("Menimbang", formData.menimbang);
        console.log("Prodi edit - MhsId:", formData.mhsId, "Menimbang length:", formData.menimbang.length);
      }

      fd.append(
        "ModifiedBy",
        userData?.mhsId || userData?.nama || userData?.userid || userData?.username || "SYSTEM"
      );

      console.log("Edit form data being sent:", {
        TahunAjaran: formData.tahunAjaran,
        Semester: formData.semester,
        MhsId: formData.mhsId,
        HasNewSuratPernyataan: !!(formData.suratPernyataan instanceof File),
        HasNewLampiran: !!(formData.lampiran instanceof File),
        IsProdi: isProdi
      });

      const url = `${API_LINK}CutiAkademik/${realId}`;
      console.log("Updating at URL:", url);
      
      const res = await fetch(url, {
        method: "PUT",
        body: fd,
      });

      const raw = await res.text();
      console.log("Edit response:", raw);
      
      let result;

      try {
        result = JSON.parse(raw);
      } catch {
        Toast.error("Response server tidak valid.");
        return;
      }

      if (result?.message?.toLowerCase().includes("berhasil")) {
        Toast.success("Perubahan berhasil disimpan.");
        sessionStorage.removeItem("editCutiDraft");
        router.push("/pages/administrasi-akademik/Cuti-Akademik");
      } else {
        Toast.error(result?.message || "Gagal menyimpan perubahan.");
      }
    } catch (err) {
      console.error("Edit submit error:", err);
      Toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => router.back();

  const semesterData = [
    { Value: "Ganjil", Text: "Ganjil" },
    { Value: "Genap", Text: "Genap" },
  ];

  // ============================
  // VIEW
  // ============================
  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title={isProdi ? "Edit Pengajuan Cuti Akademik (Prodi)" : isMahasiswa ? "Edit Pengajuan Cuti Akademik (Mahasiswa)" : "Edit Pengajuan Cuti Akademik"}
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: isProdi ? "Edit Pengajuan (Prodi)" : isMahasiswa ? "Edit Pengajuan (Mahasiswa)" : "Edit Pengajuan" },
      ]}
    >
      <form onSubmit={handleSubmit}>
        {isProdi && (
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
              {loadingStudents && (
                <small className="text-muted">Memuat daftar mahasiswa...</small>
              )}
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
                placeholder="Otomatis terisi dari NIM"
              />
            </div>
          </div>
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
                isDisabled={(isProdi && !formData.mhsId) || (isMahasiswa && !formData.angkatan)}
              />
            ) : (
              <>
                <Label
                  text="Tahun Akademik"
                  htmlFor="tahunAjaran"
                  required={true}
                />
                <select
                  className="form-control rounded-4 blue-element"
                  name="tahunAjaran"
                  value={formData.tahunAjaran}
                  onChange={handleChange}
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
                  className="form-control rounded-4 blue-element"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
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

        <div className="row mt-4">
          <div className="col-lg-6">
            <Label
              text={isProdi ? "Berkas Surat Pernyataan" : "Surat Pernyataan"}
              htmlFor="suratPernyataan"
              required={true}
            />
            <input
              type="file"
              className="form-control rounded-4 blue-element"
              name="suratPernyataan"
              onChange={handleChange}
            />
            <small className="text-muted">File sebelumnya: {formData.oldSurat || "-"}</small>
            <br />
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
              className="form-control rounded-4 blue-element"
              name="lampiran"
              onChange={handleChange}
            />
            <small className="text-muted">File sebelumnya: {formData.oldLampiran || "-"}</small>
            <br />
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
          <Button
            classType="primary"
            iconName="save"
            label={saving ? "Menyimpan..." : "Simpan Editor"}
            type="submit"
            isDisabled={saving}
          />
        </div>
      </form>
    </MainContent>
  );
}