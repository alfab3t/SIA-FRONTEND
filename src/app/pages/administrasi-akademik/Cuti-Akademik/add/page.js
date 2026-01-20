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
      } catch {
        setPermission(null);
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
    tahunAjaran: "",
    semester: "",
    suratPernyataan: null,
    lampiran: null,
    konId: "",
    mhsId: "",
    angkatan: "",
    menimbang: "",
  });

  const [errors, setErrors] = useState({});
  const [bebasTanggunganStatus, setBebasTanggunganStatus] = useState(null);           

  const loadStudentsForKonId = useCallback(async (konId) => {
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
        
        const mappedStudents = data.map(item => {
          return {
            Value: item.mhsId,
            Text: item.mhsNama
          };
        });
        
        setStudentList(mappedStudents);
      } else {
        Toast.error("Gagal memuat daftar mahasiswa.");
        setStudentList([]);
      }
    } catch {
      Toast.error("Terjadi kesalahan saat memuat daftar mahasiswa.");
      setStudentList([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    const username = userData?.username || userData?.nama;
    
    if (!isProdi || !username) {
      return;
    }
    
    const loadProdi = async () => {
      setLoadingProdi(true);
      try {
        const response = await fetch(`${API_LINK}Mahasiswa/GetKonsentrasiList?username=${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const mappedProdi = data.map(item => ({
            Value: item.konId,
            Text: item.nama
          }));
          
          setProdiList(mappedProdi);
          
          if (mappedProdi.length === 1) {
            setFormData(prev => ({
              ...prev,
              konId: mappedProdi[0].Value
            }));
            
            loadStudentsForKonId(mappedProdi[0].Value);
          }
        } else {
          Toast.error("Gagal memuat daftar program studi.");
        }
      } catch {
        Toast.error("Terjadi kesalahan saat memuat daftar program studi.");
      } finally {
        setLoadingProdi(false);
      }
    };

    loadProdi();
  }, [isProdi, userData?.username, userData?.nama, loadStudentsForKonId]);

  useEffect(() => {
    if (!isMahasiswa || !userData) return;
    
    const loadMahasiswaData = async () => {
      try {
        const mhsId = userData?.nama || userData?.mhsId || userData?.userid || userData?.username || "";
        
        if (!mhsId) {
          return;
        }

        const response = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${mhsId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setFormData(prev => ({
            ...prev,
            mhsId: mhsId,
            angkatan: data.mhsAngkatan?.toString() || ""
          }));
          
        } else {
          Toast.error("Gagal memuat data mahasiswa. Pastikan Anda login dengan akun yang benar.");
        }
      } catch {
        Toast.error("Terjadi kesalahan saat memuat data mahasiswa.");
      }
    };

    loadMahasiswaData();
  }, [isMahasiswa, userData]);

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

  const handleStudentChange = async (e) => {
    const mhsId = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      mhsId: mhsId,
      angkatan: ""
    }));

    setBebasTanggunganStatus(null);

    if (!mhsId) {
      return;
    }

    try {
      if (isProdi) {
        const btResponse = await fetch(`${API_LINK}Mahasiswa/CheckBebasTanggungan?userId=${mhsId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (btResponse.ok) {
          const btData = await btResponse.json();
          setBebasTanggunganStatus(btData.status);
        }
      }

      const response = await fetch(`${API_LINK}Mahasiswa/GetDetail?mhsId=${mhsId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const detailData = await response.json();
        
        const angkatan = detailData.mhsAngkatan || "";
        
        setFormData(prev => ({
          ...prev,
          angkatan: angkatan.toString()
        }));
      } else {
        Toast.error("Gagal memuat detail mahasiswa.");
      }
    } catch {
      Toast.error("Terjadi kesalahan saat memuat detail mahasiswa.");
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (files?.[0]) {
      const file = files[0];
      const maxSize = 10 * 1024 * 1024;
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      if (file.size > maxSize) {
        Toast.error(`File ${file.name} terlalu besar. Maksimal 10MB.`);
        e.target.value = '';
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        Toast.error(`Format file ${file.name} tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG.`);
        e.target.value = '';
        return;
      }
      
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
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const validate = () => {
    const newErrors = {};
    
    if (isProdi) {
      if (!formData.konId) newErrors.konId = "Program studi harus dipilih.";
      if (!formData.mhsId) newErrors.mhsId = "Mahasiswa harus dipilih.";
      if (!formData.menimbang || formData.menimbang.trim() === "" || formData.menimbang === "<p></p>") {
        newErrors.menimbang = "Menimbang/pertimbangan wajib diisi.";
      }
    }
    
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

  const buildProdiFormData = useCallback((fd) => {
    const approvalProdi = userData?.nama || userData?.username || userData?.userid || "";
    
    fd.append("MhsId", formData.mhsId);
    fd.append("TahunAjaran", formData.tahunAjaran);
    fd.append("Semester", formData.semester);
    fd.append("Menimbang", formData.menimbang);
    fd.append("ApprovalProdi", approvalProdi);
  }, [formData, userData]);

  const buildMahasiswaFormData = useCallback((fd) => {
    const mhsId = userData?.mhsId || userData?.nama || userData?.userid || userData?.username || "";
    
    if (!mhsId) {
      Toast.error("User tidak valid.");
      return false;
    }
    
    fd.append("Step", "STEP1");
    fd.append("MhsId", mhsId);
    fd.append("TahunAjaran", formData.tahunAjaran);
    fd.append("Semester", formData.semester);
    
    return true;
  }, [formData, userData]);

  const appendFilesToFormData = useCallback((fd) => {
    if (formData.suratPernyataan && formData.suratPernyataan instanceof File) {
      fd.append("LampiranSuratPengajuan", formData.suratPernyataan, formData.suratPernyataan.name);
    }
    
    if (formData.lampiran && formData.lampiran instanceof File) {
      fd.append("Lampiran", formData.lampiran, formData.lampiran.name);
    }
  }, [formData]);

  const handleSubmissionSuccess = useCallback((result) => {
    if (isProdi) {
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
  }, [isProdi, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);

    try {
      const fd = new FormData();
      
      if (isProdi) {
        buildProdiFormData(fd);
      } else {
        const success = buildMahasiswaFormData(fd);
        if (!success) return;
      }

      appendFilesToFormData(fd);

      const endpoint = isProdi 
        ? `${API_LINK}CutiAkademik/prodi/draft`
        : `${API_LINK}CutiAkademik/draft`;

      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
      });

      const raw = await res.text();

      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        Toast.error("Server mengirim response tidak valid:\n\n" + raw);
        return;
      }

      if (result?.draftId) {
        handleSubmissionSuccess(result);
      } else {
        Toast.error(result?.message || "Gagal membuat pengajuan.");
      }
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => router.back();

  const [tahunAjaranData, setTahunAjaranData] = useState([]);

  const generateTahunAkademik = (angkatan) => {
    if (!angkatan) {
      const currentYear = new Date().getFullYear();
      return [
        { Value: `${currentYear-1}/${currentYear}`, Text: `${currentYear-1}/${currentYear}` },
        { Value: `${currentYear}/${currentYear+1}`, Text: `${currentYear}/${currentYear+1}` },
        { Value: `${currentYear+1}/${currentYear+2}`, Text: `${currentYear+1}/${currentYear+2}` },
      ];
    }

    const tahunSekarang = new Date().getFullYear() - 1;
    const angkatanInt = Number.parseInt(angkatan, 10);
    const tahunAkademikList = [];

    for (let i = tahunSekarang; i <= angkatanInt + 3; i++) {
      const tahunAkademik = `${i}/${i + 1}`;
      tahunAkademikList.push({
        Value: tahunAkademik,
        Text: tahunAkademik
      });
    }

    return tahunAkademikList;
  };

  useEffect(() => {
    if ((isProdi || isMahasiswa) && formData.angkatan) {
      const newTahunAkademikData = generateTahunAkademik(formData.angkatan);
      setTahunAjaranData(newTahunAkademikData);
      
      setFormData(prev => ({
        ...prev,
        tahunAjaran: ""
      }));
    } else if (!isProdi && !isMahasiswa) {
      const defaultTahunAkademik = generateTahunAkademik(null);
      setTahunAjaranData(defaultTahunAkademik);
    }
  }, [formData.angkatan, isProdi, isMahasiswa]);

  useEffect(() => {
    if (!isProdi && !isMahasiswa) {
      const defaultTahunAkademik = generateTahunAkademik(null);
      setTahunAjaranData(defaultTahunAkademik);
    }
  }, [isProdi, isMahasiswa]);

  const semesterData = [
    { Value: "Ganjil", Text: "Ganjil" },
    { Value: "Genap", Text: "Genap" },
  ];

  const getPageTitle = () => {
    if (isProdi) return "Tambah Pengajuan Cuti Akademik (Prodi)";
    if (isMahasiswa) return "Tambah Pengajuan Cuti Akademik (Mahasiswa)";
    return "Tambah Pengajuan Cuti Akademik";
  };

  return (
    <MainContent
      title={getPageTitle()}
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: isProdi ? "Tambah Pengajuan (Prodi)" : "Tambah Pengajuan" },
      ]}
    >
      {isProdi && formData.mhsId && bebasTanggunganStatus === "NOK" && (
        <div className="mb-3">
          <div className="alert alert-warning mb-2" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Mahasiswa belum menyelesaikan administrasi bebas tanggungan</strong>
          </div>
          <button 
            type="button"
            className="btn btn-link p-0 text-primary text-decoration-underline" 
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/pages/administrasi-akademik/bebas-tanggungan')}
          >
            <i className="fas fa-eye me-1"></i>
            {" "}Lihat Administrasi Bebas Tanggungan
          </button>
        </div>
      )}

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