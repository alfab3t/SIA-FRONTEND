"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Paging from "@/components/common/Paging";
import Table from "@/components/common/Table";
import Toast from "@/components/common/Toast";
import DropDown from "@/components/common/Dropdown";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import { useRouter } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { encryptIdUrl } from "@/lib/encryptor";
import SweetAlert from "@/components/common/SweetAlert";
import { getSSOData, getUserData } from "@/context/user";

export default function Page_Administrasi_Pengajuan_Cuti_Akademik() {
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const router = useRouter();

  // ---------------- STATE -----------------
  const [dataPengajuan, setDataPengajuan] = useState([]);
  const [riwayatData, setRiwayatData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  const sortRef = useRef();
  const statusRef = useRef();

  const role = (userData?.role || "").toUpperCase();
  const isMahasiswa = role === "MAHASISWA";
  const isProdi = role === "PRODI";

  const dataFilterSort = [
    { Value: "tanggal_desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "tanggal_asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "id_asc", Text: "No Pengajuan [↑]" },
    { Value: "id_desc", Text: "No Pengajuan [↓]" },
  ];

  const dataFilterStatus = [
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Belum Disetujui Prodi", Text: "Belum Disetujui Prodi" },
    { Value: "Belum Disetujui Wadir 1", Text: "Belum Disetujui Wadir 1" },
    { Value: "Belum Disetujui Finance", Text: "Belum Disetujui Finance" },
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" },
  ];

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");

  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDataPengajuan, setTotalDataPengajuan] = useState(0);

  // ---------------- LOAD DATA PENGAJUAN -------------------
  const loadPengajuan = useCallback(
    async (page, sort, cari, status) => {
      try {
        setLoading(true);

        const url = `${API_LINK}CutiAkademik/CutiAkademikListResponse?status=${encodeURIComponent(
          status || ""
        )}&search=${encodeURIComponent(cari || "")}&urut=${encodeURIComponent(
          sort || ""
        )}&pageNumber=${page}&pageSize=${pageSize}`;

        const response = await fetch(url);
        const json = await response.json();

        const { data, totalData } = json;

        const mapped = data?.map((item, i) => ({
          No: (page - 1) * pageSize + i + 1,
          id: item.id,
          "No Pengajuan": item.idDisplay,
          "Tanggal Pengajuan": item.tanggal,
          "No SK": item.suratNo || "-",
          "Disetujui Prodi": item.approveProdi ? "✔" : "❌",
          "Disetujui Wadir 1": item.approveDir1 ? "✔" : "❌",
          Status: item.status,
          "SK Cuti Akademik": item.suratNo ? "🖨" : "-",
          Aksi:
            isMahasiswa ? ["Detail", "Edit", "Delete"] : isProdi ? ["Detail"] : [],
          Alignment: Array(12).fill("center"),
        }));

        setDataPengajuan(mapped || []);
        setTotalDataPengajuan(totalData || 0);
        setCurrentPage(page);
      } catch (e) {
        Toast.error("Gagal memuat data pengajuan");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, isMahasiswa, isProdi]
  );

  // ---------------- LOAD RIWAYAT (TABEL BAWAH) -------------------
  const loadRiwayat = useCallback(async () => {
    try {
      setLoadingRiwayat(true);

      const url = `${API_LINK}CutiAkademik/riwayat?username=${userData?.username}`;
      const response = await fetch(url);
      const data = await response.json();

      const mapped = data?.map((item, i) => ({
        No: i + 1,  
        id: item.id,
        "No Cuti Akademik": item.idDisplay,
        "Tanggal Pengajuan": item.tanggal,
        "Nomor SK": item.suratNo || "-",
        NIM: item.nim,
        "Nama Mahasiswa": item.namaMahasiswa,
        Prodi: item.prodi,
        Alignment: Array(12).fill("center"),
        Aksi: ["Detail"],
      }));

      setRiwayatData(mapped || []);
    } catch (e) {
      Toast.error("Gagal memuat riwayat cuti.");
    } finally {
      setLoadingRiwayat(false);
    }
  }, [userData]);

  // ---------------- FIRST LOAD -------------------
  useEffect(() => {
    if (!ssoData || !userData) return;

    loadPengajuan(1, sortBy, search, sortStatus);
    loadRiwayat(); // ← langsung load riwayat tanpa mode
  }, [ssoData, userData, loadPengajuan, loadRiwayat, sortBy, search, sortStatus]);

  // ---------------- HANDLERS -------------------
  const handleSearch = (q) => {
    setSearch(q);
    loadPengajuan(1, sortBy, q, sortStatus);
  };

  const handleAdd = () =>
    router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/add");

  const handleDetail = (id) =>
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/detail/${encryptIdUrl(id)}`
    );

  const handleEdit = (id) =>
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/edit/${encryptIdUrl(id)}`
    );

  const handleDelete = async (id) => {
    const confirm = await SweetAlert({
      title: "Hapus Pengajuan Cuti",
      text: "Yakin ingin menghapus data ini?",
      icon: "warning",
      confirmText: "Ya, hapus!",
      confirmButtonColor: "#d33",
    });

    if (!confirm) return;

    try {
      const url = `${API_LINK}CutiAkademik/${id}`;
      await fetch(url, { method: "DELETE" });

      Toast.success("Data berhasil dihapus");
      loadPengajuan(1, sortBy, search, sortStatus);
    } catch {
      Toast.error("Gagal menghapus data");
    }
  };

  // ---------------- UI RETURN -------------------
  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Daftar Pengajuan Cuti Akademik"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
      ]}
    >
      {/* ========= FORM SEARCH TABEL PENGAJUAN ========= */}
      <Formsearch
        onSearch={handleSearch}
        onAdd={isMahasiswa || isProdi}
        onFilter={() => {
          setSortBy(sortRef.current.value);
          setSortStatus(statusRef.current.value);
          loadPengajuan(1, sortRef.current.value, search, statusRef.current.value);
        }}
        showAddButton={isMahasiswa || isProdi}
        searchPlaceholder="Cari No. Pengajuan"
        addButtonText="Tambah Pengajuan"
        filterContent={
          <>
            <DropDown
              ref={sortRef}
              arrData={dataFilterSort}
              type="pilih"
              label="Urutkan"
              forInput="sortBy"
              defaultValue={sortBy}
            />
            <DropDown
              ref={statusRef}
              arrData={dataFilterStatus}
              type="pilih"
              label="Status"
              forInput="sortStatus"
              defaultValue={sortStatus}
            />
          </>
        }
      />

      {/* ========= TABEL PENGAJUAN ========= */}
      <Table
        data={dataPengajuan}
        onDetail={handleDetail}
        onEdit={isMahasiswa ? handleEdit : undefined}
        onDelete={isMahasiswa ? handleDelete : undefined}
      />

      {totalDataPengajuan > 0 && (
        <Paging
          pageSize={pageSize}
          pageCurrent={currentPage}
          totalData={totalDataPengajuan}
          navigation={(page) =>
            loadPengajuan(page, sortBy, search, sortStatus)
          }
        />
      )}

      {/* =======================================
          TABEL RIWAYAT CUTI AKADEMIK (DI BAWAH)
      ======================================== */}
      <h3 style={{ marginTop: "40px", marginBottom: "10px" }}>
        Daftar Riwayat Cuti Akademik
      </h3>

      <Table
        data={riwayatData}
        loading={loadingRiwayat}
        onDetail={handleDetail}
      />
    </MainContent>
  );
}
