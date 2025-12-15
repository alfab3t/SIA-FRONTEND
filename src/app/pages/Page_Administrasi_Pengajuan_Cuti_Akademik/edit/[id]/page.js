"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainContent from "@/components/layout/MainContent";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { useRouter, useParams } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { decryptIdUrl } from "@/lib/encryptor";
import { getUserData } from "@/context/user";

export default function EditCutiAkademikPage() {
  const router = useRouter();
  const params = useParams();
  const userData = useMemo(() => getUserData(), []);

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

  const [formData, setFormData] = useState({
    tahunAjaran: "",
    semester: "",
    suratPernyataan: null,
    lampiran: null,
    oldSurat: "",
    oldLampiran: "",
  });

  // ============================
  // HANDLE INPUT
  // ============================
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

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

      setFormData({
        tahunAjaran: data.tahunAjaran || "",
        semester: data.semester || "",
        oldSurat: data.lampiranSP || "",
        oldLampiran: data.lampiran || "",
        suratPernyataan: null,
        lampiran: null,
      });

    } finally {
      setLoading(false);
    }
  }, [realId]);

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

      setFormData({
        tahunAjaran: data.tahunAjaran || "",
        semester: data.semester || "",
        oldSurat: data.lampiranSP || "",
        oldLampiran: data.lampiran || "",
        suratPernyataan: null,
        lampiran: null,
      });

      setLoading(false);
    } else {
      loadDetailFromApi();
    }
  }, [realId, loadDetailFromApi, router]);

  // ============================
  // SUBMIT UPDATE
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      const fd = new FormData();

      fd.append("TahunAjaran", formData.tahunAjaran);
      fd.append("Semester", formData.semester);

      // 🔥 HARUS SESUAI DTO BE
      if (formData.suratPernyataan) {
        fd.append("LampiranSuratPengajuan", formData.suratPernyataan);
      }

      if (formData.lampiran) {
        fd.append("Lampiran", formData.lampiran);
      }

      fd.append(
        "ModifiedBy",
        userData?.mhsId || userData?.userid || "SYSTEM"
      );

      const url = `${API_LINK}CutiAkademik/${realId}`;
      const res = await fetch(url, {
        method: "PUT",
        body: fd,
      });

      const raw = await res.text();
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
      Toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => router.back();

  // ============================
  // VIEW
  // ============================
  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Edit Pengajuan Cuti Akademik"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
        { label: "Edit Pengajuan" },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <div className="row mt-3">
          <div className="col-lg-6">
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
          </div>

          <div className="col-lg-6">
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
          </div>
        </div>

        <div className="row mt-4">
          <div className="col-lg-6">
            <label className="form-label">Surat Pernyataan *</label>
            <input
              type="file"
              className="form-control"
              name="suratPernyataan"
              onChange={handleChange}
            />
            <small>File sebelumnya: {formData.oldSurat || "-"}</small>
          </div>

          <div className="col-lg-6">
            <label className="form-label">Lampiran (Opsional)</label>
            <input
              type="file"
              className="form-control"
              name="lampiran"
              onChange={handleChange}
            />
            <small>File sebelumnya: {formData.oldLampiran || "-"}</small>
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
            label={saving ? "Menyimpan..." : "Simpan Perubahan"}
            type="submit"
            isDisabled={saving}
          />
        </div>
      </form>
    </MainContent>
  );
}