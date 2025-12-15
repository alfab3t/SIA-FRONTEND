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
  
  // ========== TAMBAHAN: LOAD PERMISSION TANPA MENGURANGI KODE LAMA ==========
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
      console.log("PERMISSION LOADED =", data);

      setPermission(data);
    } catch (err) {
      console.error("Gagal load permission:", err);
    }
  };

  if (userData?.username) loadPermission();
}, [userData]);


  const router = useRouter();
  const [dataCutiAkademik, setDataCutiAkademik] = useState([]);
  const [loading, setLoading] = useState(true);

  const sortRef = useRef();
  const statusRef = useRef();

  // =========================
  // ROLE HANDLING
  // =========================

  let fixedRole = (userData?.role || "").toUpperCase();

if (permission?.roleName) {
  fixedRole = permission.roleName.toUpperCase();
}


const role = fixedRole;
const isMahasiswa = fixedRole === "MAHASISWA";
const isProdi = fixedRole === "PRODI";
const isAdmin = fixedRole === "ADMIN";


  useEffect(() => {
    if (isAdmin) router.push("/pages/Page_Riwayat_Cuti_Akademik");
  }, [isAdmin, router]);

  // =========================
  // FILTER OPTIONS
  // =========================
  const dataFilterSort = [
    { Value: "tanggal_desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "tanggal_asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "id_asc", Text: "No Pengajuan [↑]" },
    { Value: "id_desc", Text: "No Pengajuan [↓]" },
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Belum Disetujui Prodi", Text: "Belum Disetujui Prodi" },
    { Value: "Belum Disetujui Wadir 1", Text: "Belum Disetujui Wadir 1" },
    { Value: "Belum Disetujui Finance", Text: "Belum Disetujui Finance" },
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState(dataFilterStatus[0].Value);

  // ======================================================
  // LOAD DATA
  // ======================================================
  const loadData = useCallback(
    async (page, sort, cari, status) => {
      try {
        setLoading(true);

        let mhsId = "%";
        let userId = "";

        if (isMahasiswa) mhsId = userData?.nama || "";
        if (isProdi) userId = userData?.username || "";
        if (isAdmin) {
        mhsId = "%";     // semua mahasiswa
        userId = "%";    // semua user
        status = status || "";  
      }


        const url = `${API_LINK}CutiAkademik?mhsId=${encodeURIComponent(
          mhsId
        )}&status=${encodeURIComponent(status || "")}&userId=${encodeURIComponent(
          userId
        )}&role=${encodeURIComponent(fixedRole)}`;

        const response = await fetch(url);
        const data = await response.json();

        console.log("DATA API =", data); // Debug log

        if (!Array.isArray(data)) {
          setDataCutiAkademik([]);
          return;
        }

       const pagedData = data.map((item, index) => {
  // NORMALISASI STATUS
  const normalizedStatus = (item.status || "")
    .toLowerCase()
    .replace(/\s+/g, "");

  // CEK ID
  const idValue = item.idDisplay || item.id || "";

  const isDraftId = /^\d+$/.test(idValue);      // ID draft = angka semua
  const isFinalId = idValue.includes("/");      // ID final mengandung "/"

  // LOGIKA DRAFT YANG BENAR
  const isDraft =
    isDraftId ||                               // jika ID masih angka → draft
    normalizedStatus === "" ||
    normalizedStatus === "draft" ||
    normalizedStatus === "Belum Disetujui Prodi" ||
    normalizedStatus === "Belum Disetujui Wadir1" ||
    normalizedStatus === "Belum Disetujui Finance" ||
    normalizedStatus === "dihapus";

  return {
    No: (page - 1) * pageSize + index + 1,
    id: item.id,
    "No Pengajuan": idValue,
    "Tanggal Pengajuan": item.tanggal || "-",
    "No SK": item.suratNo || item.srtNo || "-",
    "Disetujui Prodi": item.approveProdi ? "✔" : "❌",
    "Disetujui Wadir 1": item.approveDir1 ? "✔" : "❌",
    Status: item.status || "-",
    "SK Cuti Akademik": item.suratNo ? "🖨" : "-",

    // AKSI SESUAI KONDISI
    Aksi: isMahasiswa
      ? isDraft       // draft → boleh edit
        ? ["Detail", "Edit", "Delete", "Ajukan"]
        : ["Detail"]  // final → hanya detail
      : isProdi
      ? ["Detail"]
      : [],

    Alignment: Array(12).fill("center"),
  };
});


        setDataCutiAkademik(pagedData);
        setTotalData(pagedData.length);
        setCurrentPage(1);
      } catch (err) {
        Toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [role, isMahasiswa, isProdi, isAdmin, userData, pageSize]
  );

  // ======================================================
  // AJUKAN CUTI AKADEMIK
  // ======================================================
  const handleAjukan = async (id) => {
    const confirm = await SweetAlert({
      title: "Ajukan Pengajuan",
      text: "Setelah diajukan, data tidak dapat diedit kembali. Ajukan sekarang?",
      icon: "warning",
      confirmText: "Ya, Ajukan!",
      confirmButtonColor: "#1e88e5",
    });

    if (!confirm) return;

    setLoading(true);

    try {
      const payload = {
        DraftId: id,
        ModifiedBy: userData?.mhsId || userData?.userid || "",
      };

      const url = `${API_LINK}CutiAkademik/generate-id`;

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let result;

      try {
        result = JSON.parse(raw);
      } catch {
        Toast.error("Response server tidak valid:\n\n" + raw);
        return;
      }

      if (result?.finalId) {
        Toast.success("Pengajuan berhasil diajukan.");
        loadData(1, sortBy, search, sortStatus);
      } else {
        Toast.error(result?.message || "Gagal mengajukan.");
      }
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // HANDLERS
  // ======================================================
  const handleSearch = useCallback(
    (query) => {
      setSearch(query);
      loadData(1, sortBy, query, sortStatus);
    },
    [sortBy, sortStatus, loadData]
  );

  const handleFilterApply = useCallback(() => {
    setSortBy(sortRef.current.value);
    setSortStatus(statusRef.current.value);
    loadData(1, sortRef.current.value, search, statusRef.current.value);
  }, [search, loadData]);

  const handleNavigation = useCallback(
    (page) => loadData(page, sortBy, search, sortStatus),
    [sortBy, search, sortStatus, loadData]
  );

  const handleAdd = () =>
    router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/add");

  const handleDetail = (id) =>
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/detail/${encryptIdUrl(
        id
      )}`
    );

  const handleEdit = (id) =>
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/edit/${encryptIdUrl(
        id
      )}`
    );

  const handleDelete = async (id) => {
    const confirm = await SweetAlert({
      title: "Hapus Pengajuan",
      text: "Yakin ingin menghapus pengajuan ini?",
      icon: "warning",
      confirmText: "Ya, Hapus!",
      confirmButtonColor: "#d33",
    });

    if (!confirm) return;

    setLoading(true);

    try {
      const url = `${API_LINK}CutiAkademik/${id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (data.error) throw new Error(data.message);

      Toast.success("Pengajuan berhasil dihapus.");
      loadData(1, sortBy, search, sortStatus);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // FIRST LOAD
  // ======================================================
    useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    if (!userData) return;

    // FIX: SEMUA ROLE (ADMIN / MAHASISWA / PRODI) MEMANGGIL loadData
    loadData(1, sortBy, search, sortStatus);
  }, [ssoData, userData, loadData, sortBy, search, sortStatus, router]);


  const filterContent = (
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
  );

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
      <Formsearch
        onSearch={isMahasiswa ? null : handleSearch}
        onAdd={handleAdd}
        onFilter={isMahasiswa ? null : handleFilterApply}
        onExport={
          isMahasiswa ? null : () => window.open(`${API_LINK}CutiAkademik/export`, "_blank")
        }
        showAddButton={isMahasiswa}
        searchPlaceholder="Cari No. Pengajuan"
        addButtonText="Tambah Pengajuan"
        filterContent={isMahasiswa ? null : filterContent}
      />

      <Table
        data={dataCutiAkademik}
        onDetail={handleDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAjukan={handleAjukan}
      />

      {totalData > 0 && (
        <Paging
          pageSize={pageSize}
          pageCurrent={currentPage}
          totalData={totalData}
          navigation={handleNavigation}
        />
      )}
    </MainContent>
  );
}