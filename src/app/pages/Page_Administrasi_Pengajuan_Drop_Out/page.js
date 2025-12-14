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

  const dataFilterSort = [
    { Value: "a.dro_created_date desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "a.dro_created_date asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "a.dro_id asc", Text: "No Pengajuan DO [↑]" },
    { Value: "mhs_nama asc", Text: "Nama Mahasiswa [↑]" }
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" }
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState(dataFilterStatus[0].Value);

  /** ======================================================
   *  LOAD DATA – GET DropOut/riwayat sesuai parameter swagger
   * ====================================================== */
  const loadData = useCallback(
    async (page = 1, sort = "a.dro_created_date desc", keyword = "", status = "") => {
      try {
        setLoading(true);

        // pastikan struktur cookie benar
        const username = userData?.username || userData?.userName || "";
        const role = userData?.role || "";
        const displayName = userData?.fullName || userData?.displayName || "";

        if (!username) {
          console.warn("⚠ User belum terisi — username kosong.");
          setDataDropOut([]);
          return;
        }

        const params = {
          username: username,
          keyword: keyword,
          sortBy: sort,
          konsentrasi: "",
          role: role,
          displayName: displayName
        };

        const response = await fetchData(API_LINK + "DropOut/riwayat", params, "GET");

        let dataList = Array.isArray(response) ? response : response?.data || [];

        const mappedData = dataList.map((item, index) => ({
          No: (page - 1) * pageSize + index + 1,
          id: item.dro_id ?? item.id,
          "No. Pengajuan DO": item.dro_id ?? "-",
          "Tanggal Pengajuan": DateFormatter.formatDate(item.dro_created_date),
          "Dibuat Oleh": item.dro_created_by ?? "-",
          "Nama Mahasiswa": item.mhs_nama ?? "-",
          Prodi: item.kon_nama ?? "-",
          "No. SK DO": item.srt_no ?? "-",
          Status: item.dro_status ?? "-",
          Aksi: ["Detail", ...(item.srt_no ? ["Download"] : [])]
        }));

        setDataDropOut(mappedData);
        setTotalData(mappedData.length);
        setCurrentPage(page);
      } catch (err) {
        Toast.error(err.message);
        setDataDropOut([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, userData]
  );

  /** ========================== HANDLERS ========================== */

  const handleSearch = useCallback(
    (query) => {
      setSearch(query);
      loadData(1, sortBy, query, sortStatus);
    },
    [sortBy, sortStatus, loadData]
  );

  const handleFilterApply = useCallback(() => {
    const newSort = sortRef.current.value;
    const newStatus = statusRef.current.value;

    setSortBy(newSort);
    setSortStatus(newStatus);
    loadData(1, newSort, search, newStatus);
  }, [search, loadData]);

  const handleNavigation = useCallback(
    (page) => loadData(page, sortBy, search, sortStatus),
    [sortBy, search, sortStatus, loadData]
  );

  const handleDetail = useCallback(
    (id) =>
      router.push(`/pages/administrasi/drop-out/detail/${encryptIdUrl(id)}`),
    [router]
  );

  const handleDownload = useCallback(() => {
    Toast.info("Fitur download SK belum diaktifkan.");
  }, []);

  /** ====================== INITIAL LOAD ======================= */

  useEffect(() => {
    setIsClient(true);

    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("./auth/login");
      return;
    }

    loadData(1, sortBy, search, sortStatus);
  }, [ssoData, router, loadData, sortBy, search, sortStatus]);

  /** ======================== RENDER ============================ */

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
      title="Riwayat Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out" }
      ]}
    >
      <Formsearch
        onSearch={handleSearch}
        onAdd={() => router.push("/pages/administrasi/drop-out/add")}
        onFilter={handleFilterApply}
        showAddButton={isClient && userData?.permission?.includes("dropout.create")}
        showExportButton={false}
        searchPlaceholder="Cari No. Pengajuan DO / Nama Mahasiswa"
        addButtonText="Tambah Baru"
        filterContent={filterContent}
      />

      <div className="row align-items-center g-3">
        <div className="col-12">
          <Table
            data={dataDropOut}
            onDetail={handleDetail}
            onToggle={handleDownload}
          />

          {totalData > 0 && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={totalData}
              navigation={handleNavigation}
            />
          )}
        </div>
      </div>
    </MainContent>
  );
}
