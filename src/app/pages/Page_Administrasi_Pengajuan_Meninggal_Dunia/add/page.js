"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import DropDown from "@/components/common/Dropdown";
import { useRouter } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";

export default function AddMeninggalDunia() {
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

  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentList, setStudentList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const mahasiswaRef = useRef();

  const [formData, setFormData] = useState({
    // 4 required parameters as specified
    mhsId: "",
    prodi: "",
    tahunAngkatan: "",
    lampiranMeninggal: null,
  });

  const [errors, setErrors] = useState({});

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all students for dropdown
  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        console.log("=== LOADING STUDENTS ===");
        const response = await fetch(`${API_LINK}MeninggalDunia/mahasiswa`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log("Students response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Students data received:", data);
          
          const formattedStudents = data.map(item => {
            const studentData = {
              Value: item.mhsId || item.id || item.nim,
              Text: `${item.mhsId || item.id || item.nim} - ${item.nama || item.mhsNama || item.name}`,
              Prodi: item.prodi || item.konNama || item.programStudi || "",
              Angkatan: item.angkatan || item.tahunAngkatan || item.year || ""
            };
            console.log("Formatted student:", studentData);
            return studentData;
          });
          
          console.log("Final formatted students:", formattedStudents);
          setStudentList(formattedStudents);
        } else {
          const errorText = await response.text();
          console.error("Failed to load students:", errorText);
          Toast.error("Gagal memuat daftar mahasiswa.");
        }
      } catch (error) {
        console.error("Error loading students:", error);
        Toast.error("Terjadi kesalahan saat memuat daftar mahasiswa.");
      } finally {
        setLoadingStudents(false);
      }
    };

    // Load students for both prodi and mahasiswa users
    loadStudents();
  }, []);

  // Handle student selection - auto populate prodi and angkatan
  const handleStudentChange = async (e) => {
    const mhsId = e.target.value;
    
    console.log("=== STUDENT SELECTION DEBUG ===");
    console.log("Selected mhsId:", mhsId);
    
    if (!mhsId) {
      setFormData(prev => ({
        ...prev,
        mhsId: "",
        prodi: "",
        tahunAngkatan: ""
      }));
      return;
    }

    // First try to get data from the dropdown list
    const selectedStudent = studentList.find(s => s.Value === mhsId);
    console.log("Selected student from list:", selectedStudent);
    
    if (selectedStudent) {
      console.log("Setting data from dropdown:", {
        prodi: selectedStudent.Prodi,
        angkatan: selectedStudent.Angkatan
      });
      
      setFormData(prev => ({
        ...prev,
        mhsId: mhsId,
        prodi: selectedStudent.Prodi || "",
        tahunAngkatan: selectedStudent.Angkatan || ""
      }));
    }

    // Also try to get detailed data from API
    try {
      console.log("Fetching student details from API...");
      
      const detailResponse = await fetch(`${API_LINK}MeninggalDunia/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log("Detail response status:", detailResponse.status);
      
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        console.log("Detail data received:", detailData);
        
        // Try to get prodi info
        try {
          const prodiResponse = await fetch(`${API_LINK}MeninggalDunia/mahasiswa/${mhsId}/prodi`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          console.log("Prodi response status:", prodiResponse.status);
          
          let prodiData = null;
          if (prodiResponse.ok) {
            prodiData = await prodiResponse.json();
            console.log("Prodi data received:", prodiData);
          }
          
          // Update form with API data
          const finalProdi = prodiData?.nama || prodiData?.prodi || detailData?.prodi || detailData?.konNama || selectedStudent?.Prodi || "";
          const finalAngkatan = detailData?.angkatan || detailData?.tahunAngkatan || selectedStudent?.Angkatan || "";
          
          console.log("Final data to set:", {
            prodi: finalProdi,
            angkatan: finalAngkatan
          });
          
          setFormData(prev => ({
            ...prev,
            mhsId: mhsId,
            prodi: finalProdi,
            tahunAngkatan: finalAngkatan
          }));
          
        } catch (prodiError) {
          console.error("Error fetching prodi data:", prodiError);
          // Use detail data only
          setFormData(prev => ({
            ...prev,
            mhsId: mhsId,
            prodi: detailData?.prodi || detailData?.konNama || selectedStudent?.Prodi || prev.prodi,
            tahunAngkatan: detailData?.angkatan || detailData?.tahunAngkatan || selectedStudent?.Angkatan || prev.tahunAngkatan
          }));
        }
        
      } else {
        console.error("Failed to fetch student details:", detailResponse.status);
        // Keep the data from dropdown if API fails
      }
      
    } catch (error) {
      console.error("Error loading student details:", error);
      // Keep the data from dropdown if API fails
    }
  };

  // For mahasiswa users, auto-populate their data
  useEffect(() => {
    if (isMahasiswa && userData) {
      const mhsId = userData?.mhsId || userData?.nama || userData?.username || "";
      
      // Auto-select the mahasiswa in the dropdown
      setFormData(prev => ({
        ...prev,
        mhsId: mhsId
      }));

      // Trigger the student change handler to populate prodi and angkatan
      if (mhsId && studentList.length > 0) {
        const selectedStudent = studentList.find(s => s.Value === mhsId);
        if (selectedStudent) {
          setFormData(prev => ({
            ...prev,
            mhsId: mhsId,
            prodi: selectedStudent.Prodi || "",
            tahunAngkatan: selectedStudent.Angkatan || ""
          }));
        }
      }
    }
  }, [isMahasiswa, userData, studentList]);

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

  // -------------------------------------------
  // VALIDASI
  // -------------------------------------------
  const validate = () => {
    const newErrors = {};
    
    // Validate the 4 required parameters
    if (!formData.mhsId) newErrors.mhsId = "Mahasiswa harus dipilih.";
    if (!formData.prodi) newErrors.prodi = "Program studi harus diisi (otomatis dari mahasiswa).";
    if (!formData.tahunAngkatan) newErrors.tahunAngkatan = "Tahun angkatan harus diisi (otomatis dari mahasiswa).";
    if (!formData.lampiranMeninggal) newErrors.lampiranMeninggal = "Lampiran file meninggal dunia wajib di-upload.";
    
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
      
      // Add the 4 required parameters
      fd.append("MhsId", formData.mhsId);
      fd.append("Prodi", formData.prodi);
      fd.append("TahunAngkatan", formData.tahunAngkatan);
      
      // Add the file
      if (formData.lampiranMeninggal && formData.lampiranMeninggal instanceof File) {
        fd.append("LampiranMeninggal", formData.lampiranMeninggal, formData.lampiranMeninggal.name);
        console.log("Lampiran Meninggal file:", formData.lampiranMeninggal.name, formData.lampiranMeninggal.size);
      }

      console.log("FORM DATA SEND =", {
        MhsId: formData.mhsId,
        Prodi: formData.prodi,
        TahunAngkatan: formData.tahunAngkatan,
        LampiranMeninggalFile: formData.lampiranMeninggal?.name
      });

      const res = await fetch(`${API_LINK}MeninggalDunia`, {
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

      if (result?.id) {
        if (isProdi) {
          // Mark this application as created by prodi in session storage
          const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedMeninggalApps') || '[]');
          if (!prodiCreatedApps.includes(result.id)) {
            prodiCreatedApps.push(result.id);
            sessionStorage.setItem('prodiCreatedMeninggalApps', JSON.stringify(prodiCreatedApps));
          }
          Toast.success("Pengajuan Meninggal Dunia berhasil dibuat untuk mahasiswa.");
        } else {
          Toast.success("Pengajuan Meninggal Dunia berhasil dibuat.");
        }
        router.push("/pages/Page_Administrasi_Pengajuan_Meninggal_Dunia");
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

  if (!mounted) {
    return (
      <MainContent
        title="Tambah Pengajuan Meninggal Dunia"
        layout="Admin"
        breadcrumb={[
          { label: "Sistem Informasi Akademik" },
          { label: "Administrasi Akademik" },
          { label: "Meninggal Dunia" },
          { label: "Tambah Pengajuan" },
        ]}
      >
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat halaman...</p>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent
      title={isProdi ? "Tambah Pengajuan Meninggal Dunia (Prodi)" : "Tambah Pengajuan Meninggal Dunia"}
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Meninggal Dunia" },
        { label: "Tambah Pengajuan" },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <div className="row mt-3">
          <div className="col-lg-12">
            <DropDown
              ref={mahasiswaRef}
              forInput="mhsId"
              label="Mahasiswa"
              type="pilih"
              arrData={studentList}
              value={formData.mhsId}
              onChange={handleStudentChange}
              isRequired={true}
              isDisabled={loadingStudents || (isMahasiswa && formData.mhsId)}
              errorMessage={errors.mhsId}
            />
            {loadingStudents && (
              <small className="text-muted">Memuat daftar mahasiswa...</small>
            )}
            {isMahasiswa && (
              <small className="text-muted">Data mahasiswa otomatis dipilih berdasarkan login Anda.</small>
            )}
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-lg-6">
            <label className="form-label">Program Studi <span className="text-danger">*</span></label>
            <input
              type="text"
              name="prodi"
              className="form-control"
              value={formData.prodi}
              disabled
              placeholder="Otomatis terisi dari data mahasiswa"
            />
            {errors.prodi && (
              <span className="fw-normal text-danger">{errors.prodi}</span>
            )}
            <small className="text-muted">Program studi akan otomatis terisi setelah memilih mahasiswa.</small>
          </div>

          <div className="col-lg-6">
            <label className="form-label">Tahun Angkatan <span className="text-danger">*</span></label>
            <input
              type="text"
              name="tahunAngkatan"
              className="form-control"
              value={formData.tahunAngkatan}
              disabled
              placeholder="Otomatis terisi dari data mahasiswa"
            />
            {errors.tahunAngkatan && (
              <span className="fw-normal text-danger">{errors.tahunAngkatan}</span>
            )}
            <small className="text-muted">Tahun angkatan akan otomatis terisi setelah memilih mahasiswa.</small>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-lg-12">
            <label className="form-label">
              Lampiran File Meninggal Dunia <span className="text-danger">*</span>
            </label>
            <input
              type="file"
              name="lampiranMeninggal"
              className="form-control"
              onChange={handleChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {errors.lampiranMeninggal && (
              <span className="fw-normal text-danger">{errors.lampiranMeninggal}</span>
            )}
            <small className="text-muted">
              Format yang didukung: PDF, DOC, DOCX, JPG, JPEG, PNG (Maksimal 10MB)
            </small>
          </div>
        </div>

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
            label={saving ? "Menyimpan..." : "Simpan"}
            type="submit"
            isDisabled={saving}
          />
        </div>
      </form>
    </MainContent>
  );
}