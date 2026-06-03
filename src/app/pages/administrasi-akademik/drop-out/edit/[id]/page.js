"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import Toast from "@/components/common/Toast";
import SweetAlert from "@/components/common/SweetAlert";
import { API_LINK } from "@/lib/constant";
import { getSSOData } from "@/context/user";
import { useRouter, useParams } from "next/navigation";
import fetchData from "@/lib/fetch";
import { decryptIdUrl } from "@/lib/encryptor";

export default function Page_Edit_DropOut() {
  const router = useRouter();
  const params = useParams();
  const ssoData = useMemo(() => getSSOData(), []);

  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [detailData, setDetailData] = useState(null);

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
      const encryptedId = params.id;
      const id = decryptIdUrl(encryptedId);
      
      if (!id) {
        Toast.error("ID tidak valid");
        router.push("/pages/administrasi-akademik/drop-out");
        return;
      }
      
      const response = await fetchData(
        API_LINK + `DropOut/detail`,
        { id: id },
        "GET"
      );

      if (response) {
        console.log("=== EDIT FORM - DETAIL DATA ===");
        console.log("Full response:", response);
        console.log("mhsText:", response.mhsText);
        console.log("mhstext:", response.mhstext);
        console.log("mahasiswa:", response.mahasiswa);
        console.log("namaMahasiswa:", response.namaMahasiswa);
        console.log("prodi:", response.prodi);
        console.log("konsentrasi:", response.konsentrasi);
        console.log("All keys:", Object.keys(response));
        console.log("===============================");
        
        // Store detail data
        setDetailData(response);
        
        // Set form data dari response - hanya menimbang dan mengingat
        setFormData({
          menimbang: response.menimbang || response.lampiran || "",
          mengingat: response.mengingat || response.lampiranSuratPengajuan || "",
        });
      }
    } catch (err) {
      console.error("Load detail error:", err);
      Toast.error("Gagal memuat data: " + err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };


  const handleEditorChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  // Submit Update - hanya menimbang dan mengingat
  const handleSubmit = async () => {
    const newErrors = {};
    
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

    const encryptedId = params.id;
    const id = decryptIdUrl(encryptedId);
    
    if (!id) {
      Toast.error("ID tidak valid");
      return;
    }
    
    const payload = {
      menimbang: formData.menimbang,
      mengingat: formData.mengingat
    };

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
        { label: "Drop Out", href: "/pages/administrasi-akademik/drop-out" },
        { label: "Edit" }
      ]}
    >
      <Card title="Edit Pengajuan Drop Out">
        {/* Readonly Information Section */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label htmlFor="prodi" className="form-label fw-bold">Program Studi</label>
            <input
              id="prodi"
              type="text"
              className="form-control"
              value={detailData?.prodi || "-"}
              readOnly
              disabled
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="konsentrasi" className="form-label fw-bold">Konsentrasi</label>
            <input
              id="konsentrasi"
              type="text"
              className="form-control"
              value={detailData?.konsentrasi || "-"}
              readOnly
              disabled
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="mahasiswa" className="form-label fw-bold">Mahasiswa</label>
            <input
              id="mahasiswa"
              type="text"
              className="form-control"
              value={detailData?.mhsText || detailData?.mhstext || detailData?.mahasiswa || detailData?.namaMahasiswa || "-"}
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Editor Section - Only Editable Fields */}
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
            label="Ubah"
            onClick={handleSubmit}
            iconName="floppy"
          />
        </div>
      </Card>
    </MainContent>
  );
}
