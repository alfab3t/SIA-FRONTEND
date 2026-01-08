"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import DropDown from "@/components/common/Dropdown";
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
  });

  const [errors, setErrors] = useState({});

  // Load prodi list for prodi users
  useEffect(() => {
    if (!isProdi) return;
    
    const loadProdi = async () => {
      setLoadingProdi(true);
      try {
        const response = await fetch(`${API_LINK}Mahasiswa/GetProdiList`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProdiList(data.map(item => ({
            Value: item.konId,
            Text: item.konNama
          })));
        } else {
          Toast.error("Gagal memuat daftar program studi.");
        }
      } catch (error) {
        console.error("Error loading prodi:", error);
        Toast.error("Terjadi kesalahan saat memuat daftar program studi.");
      } finally {
        setLoadingProdi(false);
      }
    };

    loadProdi();
  }, [isProdi]);

  // Load students when prodi is selected (for prodi users)
  const handleProdiChange = async (e) => {
    const konId = e.target.value;
    setFormData(prev => ({
      ...prev,
      konId: konId,
      mhsId: "",
      angkatan: ""
    }));

    if (!konId) {
      setStudentList([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const response = await fetch(`${API_LINK}Mahasiswa/GetByProdi?konId=${konId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudentList(data.map(item => ({
          Value: item.mhsId,
          Text: `${item.mhsId} - ${item.mhsNama}`,
          Angkatan: item.angkatan
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

  // Handle student selection - auto populate angkatan (for prodi users)
  const handleStudentChange = (e) => {
    const mhsId = e.target.value;
    const selectedStudent = studentList.find(s => s.Value === mhsId);
    
    setFormData(prev => ({
      ...prev,
      mhsId: mhsId,
      angkatan: selectedStudent ? selectedStudent.Angkatan : ""
    }));
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
        console.log("Loading prodi data for student:", data.mhsId);
        // Try to find the prodi for this student
        try {
          const prodiResponse = await fetch(`${API_LINK}Mahasiswa/GetProdiList`);
          if (prodiResponse.ok) {
            const prodiData = await prodiResponse.json();
            
            // For each prodi, check if this student belongs to it
            for (const prodi of prodiData) {
              const studentsResponse = await fetch(`${API_LINK}Mahasiswa/GetByProdi?konId=${prodi.konId}`);
              if (studentsResponse.ok) {
                const students = await studentsResponse.json();
                const studentFound = students.find(s => s.mhsId === data.mhsId);
                if (studentFound) {
                  // Found the prodi for this student
                  setFormData(prev => ({
                    ...prev,
                    konId: prodi.konId,
                    angkatan: studentFound.angkatan
                  }));
                  
                  // Load students for this prodi
                  setStudentList(students.map(item => ({
                    Value: item.mhsId,
                    Text: `${item.mhsId} - ${item.mhsNama}`,
                    Angkatan: item.angkatan
                  })));
                  
                  console.log("Found student's prodi:", prodi.konNama, "Angkatan:", studentFound.angkatan);
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.warn("Could not determine student's prodi:", error);
        }
      }

    } finally {
      setLoading(false);
    }
  }, [realId, isProdi]);

  // ============================
  // INIT LOAD (SESSION FIRST)
  // ============================
  useEffect(() => {
    if (!realId) {
      Toast.error("ID tidak valid.");
      router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik");
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
        router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik");
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

  // Data for dropdowns
  const tahunAjaranData = [
    { Value: "2023/2024", Text: "2023/2024" },
    { Value: "2024/2025", Text: "2024/2025" },
    { Value: "2025/2026", Text: "2025/2026" },
    { Value: "2026/2027", Text: "2026/2027" },
  ];

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
      title={isProdi ? "Edit Pengajuan Cuti Akademik (Prodi)" : "Edit Pengajuan Cuti Akademik"}
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: isProdi ? "Edit Pengajuan (Prodi)" : "Edit Pengajuan" },
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
              />
              {loadingStudents && (
                <small className="text-muted">Memuat daftar mahasiswa...</small>
              )}
            </div>

            <div className="col-lg-4">
              <label className="form-label">Angkatan</label>
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
            {isProdi ? (
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
              />
            ) : (
              <>
                <label className="form-label">Tahun Akademik *</label>
                <select
                  className="form-control"
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
          </div>

          <div className="col-lg-6">
            {isProdi ? (
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
                <label className="form-label">Semester *</label>
                <select
                  className="form-control"
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
            <label className="form-label">
              {isProdi ? "Berkas Surat Pernyataan" : "Surat Pernyataan"} *
            </label>
            <input
              type="file"
              className={isProdi ? "form-control rounded-4 blue-element" : "form-control"}
              name="suratPernyataan"
              onChange={handleChange}
            />
            <small className="text-muted">File sebelumnya: {formData.oldSurat || "-"}</small>
            {isProdi && (
              <>
                <br />
                <small className="text-muted">Format: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small>
              </>
            )}
          </div>

          <div className="col-lg-6">
            <label className="form-label">
              {isProdi ? "Berkas Lampiran (Opsional)" : "Lampiran (Opsional)"}
            </label>
            <input
              type="file"
              className={isProdi ? "form-control rounded-4 blue-element" : "form-control"}
              name="lampiran"
              onChange={handleChange}
            />
            <small className="text-muted">File sebelumnya: {formData.oldLampiran || "-"}</small>
            {isProdi && (
              <>
                <br />
                <small className="text-muted">Format: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small>
              </>
            )}
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
            label={saving ? "Menyimpan..." : "Simpan Perubahan"}
            type="submit"
            isDisabled={saving}
          />
        </div>
      </form>
    </MainContent>
  );
}