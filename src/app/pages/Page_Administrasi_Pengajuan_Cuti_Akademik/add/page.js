"use client";

import { useState, useMemo } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { useRouter } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { getUserData } from "@/context/user";

export default function AddCutiAkademik() {
  const router = useRouter();
  const userData = useMemo(() => getUserData(), []);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    tahunAjaran: "",
    semester: "",
    suratPernyataan: null,
    lampiran: null,
  });

  // -------------------------------------------
  // INPUT HANDLER
  // -------------------------------------------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  // -------------------------------------------
  // VALIDASI
  // -------------------------------------------
  const validate = () => {
    if (!formData.tahunAjaran)
      return Toast.error("Tahun akademik wajib diisi.");
    if (!formData.semester) return Toast.error("Semester wajib diisi.");
    if (!formData.suratPernyataan)
      return Toast.error("Surat pernyataan wajib di-upload.");
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
      const mhsId =
        userData?.mhsId ||
        userData?.userid ||
        userData?.username ||
        userData?.nama ||
        "";

      if (!mhsId) {
        Toast.error("User tidak valid.");
        return;
      }

      const fd = new FormData();
      fd.append("Step", "STEP1");
      fd.append("MhsId", mhsId);
      fd.append("TahunAjaran", formData.tahunAjaran);
      fd.append("Semester", formData.semester);
      fd.append("LampiranSuratPengajuan", formData.suratPernyataan);
      if (formData.lampiran) fd.append("Lampiran", formData.lampiran);

      console.log("FORM DATA SEND =", formData);

      // 🔥 route yang benar adalah:
      const endpoint = `${API_LINK}CutiAkademik/draft`;

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
        Toast.success("Pengajuan Cuti berhasil dibuat.");
        router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik");
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

  return (
    <MainContent
      title="Tambah Pengajuan Cuti Akademik"
      layout="Admin"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: "Tambah Pengajuan" },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <div className="row mt-3">

          <div className="col-lg-6">
            <label className="form-label">Tahun Akademik *</label>
            <select
              name="tahunAjaran"
              className="form-control"
              onChange={handleChange}
            >
              <option value="">— Pilih Tahun Akademik —</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>

          <div className="col-lg-6">
            <label className="form-label">Semester *</label>
            <select
              name="semester"
              className="form-control"
              onChange={handleChange}
            >
              <option value="">— Pilih Semester —</option>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

        </div>

        <div className="row mt-4">
          <div className="col-lg-6">
            <label className="form-label">Surat Pernyataan *</label>
            <input
              type="file"
              name="suratPernyataan"
              className="form-control"
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-lg-6">
            <label className="form-label">Lampiran (Opsional)</label>
            <input
              type="file"
              name="lampiran"
              className="form-control"
              onChange={handleChange}
            />
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
