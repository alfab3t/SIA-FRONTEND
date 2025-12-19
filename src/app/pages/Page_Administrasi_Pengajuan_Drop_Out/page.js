"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Paging from "@/components/common/Paging";
import Table from "@/components/common/Table";
import Toast from "@/components/common/Toast";
import DropDown from "@/components/common/Dropdown";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import { useRouter } from "next/navigation";
import fetchData from "@/lib/fetch";
import { API_LINK } from "@/lib/constant";
import { encryptIdUrl } from "@/lib/encryptor";
import { getSSOData, getUserData } from "@/context/user";
import DateFormatter from "@/lib/dateFormater";

export default function Page_Administrasi_Pengajuan_Drop_Out() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [dataDropOut, setDataDropOut] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();

  /* ================= FILTER ================= */

  const dataFilterSort = [
    { Value: "a.dro_created_date desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "a.dro_created_date asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "a.dro_id asc", Text: "No Pengajuan DO [↑]" },
    { Value: "mhs_nama asc", Text: "Nama Mahasiswa [↑]" }
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Draft", Text: "Draft" },
    { Value: "Belum Disetujui Wadir 1", Text: "Menunggu Wadir 1" },
    { Value: "Belum Disetujui Direktur", Text: "Menunggu Direktur" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" }
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");

  /* ================= ROLE CHECK (INI KUNCI UTAMA) ================= */

  const canCreate = useMemo(() => {
    if (!isClient || !userData?.role) return false;

    const role = userData.role.toUpperCase();

    return (
      role.includes("MAHASISWA") ||
      role.includes("PRODI")
    );
  }, [isClient, userData]);

  /* ================= LOAD DATA ================= */

  const loadData = useCallback(
    async (page = 1, sort = sortBy, keyword = "", status = "") => {
      try {
        setLoading(true);

        const username = userData?.username || "";
        const role = userData?.role || "";
        const displayName =
          userData?.displayName ||
          userData?.fullName ||
          "";

        if (!username) {
          setDataDropOut([]);
          return;
        }

        const params = {
          username,
          keyword,
          sortBy: sort,
          konsentrasi: "",
          role,
          displayName
        };

        const response = await fetchData(
          API_LINK + "DropOut/riwayat",
          params,
          "GET"
        );

        const list = Array.isArray(response)
          ? response
          : response?.data || [];

        const mapped = list.map((item, index) => ({
          No: (page - 1) * pageSize + index + 1,
          id: item.dro_id,
          "No. Pengajuan DO": item.dro_id ?? "-",
          "Tanggal Pengajuan": DateFormatter.formatDate(item.dro_created_date),
          "Nama Mahasiswa": item.mhs_nama ?? "-",
          Prodi: item.kon_nama ?? "-",
          Status: item.dro_status ?? "-",
          "No. SK DO": item.srt_no ?? "-",
          Aksi: ["Detail"]
        }));

        setDataDropOut(mapped);
        setTotalData(mapped.length);
        setCurrentPage(page);
      } catch (err) {
        Toast.error(err.message);
        setDataDropOut([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, sortBy, userData]
  );

  /* ================= HANDLER ================= */

  const handleSearch = (q) => {
    setSearch(q);
    loadData(1, sortBy, q, sortStatus);
  };

  const handleFilterApply = () => {
    const s = sortRef.current.value;
    const st = statusRef.current.value;

    setSortBy(s);
    setSortStatus(st);
    loadData(1, s, search, st);
  };

  const handleDetail = (id) => {
    router.push(`/pages/administrasi/drop-out/detail/${encryptIdUrl(id)}`);
  };

  /* ================= INIT ================= */

  useEffect(() => {
    setIsClient(true);

    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    loadData();
  }, [ssoData, loadData, router]);

  /* ================= FILTER UI ================= */

  const filterContent = (
    <>
      <DropDown
        ref={sortRef}
        arrData={dataFilterSort}
        label="Urutkan"
        defaultValue={sortBy}
      />
      <DropDown
        ref={statusRef}
        arrData={dataFilterStatus}
        label="Status"
        defaultValue={sortStatus}
      />
    </>
  );

  /* ================= RENDER ================= */

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out" }
      ]}
    >
      <Formsearch
        onSearch={handleSearch}
        onAdd={() =>
          router.push("/pages/Page_Administrasi_Pengajuan_Drop_Out/add")
        }
        onFilter={handleFilterApply}
        showAddButton={canCreate}
        addButtonText="Tambah Pengajuan"
        searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
        filterContent={filterContent}
      />

      <Table
        data={dataDropOut}
        onDetail={handleDetail}
      />

      {totalData > 0 && (
        <Paging
          pageSize={pageSize}
          pageCurrent={currentPage}
          totalData={totalData}
          navigation={(p) =>
            loadData(p, sortBy, search, sortStatus)
          }
        />
      )}
    </MainContent>
  );
}
