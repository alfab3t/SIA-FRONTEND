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
import SweetAlert from "@/components/common/SweetAlert";
import { getSSOData, getUserData } from "@/context/user";
import DateFormatter from "@/lib/dateFormater";

// Nama file: Page_Administrasi_Pengajuan_Pengunduran_Diri.js
export default function Page_Administrasi_Pengajuan_Pengunduran_Diri() {
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);
  const router = useRouter();
  const [dataPengunduranDiri, setDataPengunduranDiri] = useState([]); // Ubah nama state
  const [loading, setLoading] = useState(true);
  const sortRef = useRef();
  const statusRef = useRef();
  const [isClient, setIsClient] = useState(false);

  // Data untuk Urutkan (Sort)
  const dataFilterSort = [
    { Value: "[Tanggal Pengajuan] desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "[Tanggal Pengajuan] asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "[No Pengajuan] asc", Text: "No Pengajuan [↑]" },
    { Value: "[Nama Mahasiswa] asc", Text: "Nama Mahasiswa [↑]" },
  ];

  // Data untuk Status Pengajuan Pengunduran Diri (Sesuai Screenshot)
  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" }, 
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" }, 
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" },
    // Tambahkan status lain jika ada, misal:
    // { Value: "Belum Disetujui Prodi", Text: "Belum Disetujui Prodi" },
    // { Value: "Belum Disetujui Wadir 1", Text: "Belum Disetujui Wadir 1" },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState(dataFilterStatus[0].Value);

  const loadData = useCallback(
    async (page, sort, cari, status) => {
      try {
        setLoading(true);

        // Ubah endpoint dan parameter
        const response = await fetchData(
          API_LINK + "PengunduranDiri/GetAllPengajuan", // Ganti dengan API endpoint Pengunduran Diri
          {
            Status: status === "" ? null : status,
            ...(cari !== "" ? { SearchKeyword: cari } : {}),
            Urut: sort,
            PageNumber: page,
            PageSize: pageSize,
          },
          "GET"
        );

        if (response.error) {
          console.error("API Error:", response.message);
          throw new Error(response.message || "Gagal mengambil data pengajuan pengunduran diri.");
        }

        const { data, totalData } = response;
        
        // --- Perbaikan Mapping Data Pengunduran Diri ---
        const pagedData = data.map((item, index) => ({
          No: (page - 1) * pageSize + index + 1,
          id: item.idPengunduranDiri || item.id,
          
          // Kolom sesuai screenshot Daftar Pengajuan Pengunduran Diri
          "No Pengajuan": item.noPengajuan || "-",
          "Tanggal Pengajuan": DateFormatter.formatDate(item.tanggalPengajuan) || "-",
          "Nomor SK": item.nomorSK || "-",
          
          // Logika Persetujuan (✔/❌)
          "Disetujui Prodi": item.isApprovedProdi ? "✔" : "❌", 
          "Disetujui Wadir 1": item.isApprovedWadir1 ? "✔" : "❌", 
          
          Status: item.statusPengajuan || "Status Tidak Diketahui", 
          
          // Kolom Cetak SK
          "Cetak SK": (item.linkSK || item.nomorSK) ? "🖨️" : "-", // Ikon cetak
          
          Aksi: [
            "Detail",
            // Aksi Edit & Delete/Upload (sesuaikan permission)
            ...(isClient && userData?.permission?.includes("undurdiri.edit")
              ? ["Edit"] 
              : []),
            // Aksi Upload/Download SK (sesuai ikon upload di screenshot)
            ...(isClient && userData?.permission?.includes("undurdiri.upload_sk")
              ? ["Upload"] // Ganti 'Toggle' menjadi 'Upload' atau 'Delete'
              : []),
          ],
          Alignment: [
            "center", // No
            "center", // No Pengajuan
            "center", // Tanggal Pengajuan
            "center", // Nomor SK
            "center", // Disetujui Prodi
            "center", // Disetujui Wadir 1
            "center", // Status
            "center", // Cetak SK
            "center", // Aksi
          ],
        }));
        // --- Akhir Perbaikan Mapping Data ---

        setDataPengunduranDiri(pagedData || []);
        setTotalData(totalData || 0);
        setCurrentPage(page);
      } catch (err) {
        Toast.error(err.message);
        setDataPengunduranDiri([]);
        setTotalData(0);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, isClient, userData]
  );

  // --- Handler Fungsi ---

  const handleSearch = useCallback(
    (query) => {
      setSearch(query);
      setCurrentPage(1);
      loadData(1, sortBy, query, sortStatus);
    },
    [sortBy, sortStatus, loadData]
  );

  const handleFilterApply = useCallback(() => {
    const newSortBy = sortRef.current.value;
    const newSortStatus = statusRef.current.value;

    setSortBy(newSortBy);
    setSortStatus(newSortStatus);
    setCurrentPage(1);
    loadData(1, newSortBy, search, newSortStatus);
  }, [search, loadData]);

  const handleNavigation = useCallback(
    (page) => {
      loadData(page, sortBy, search, sortStatus);
    },
    [sortBy, search, sortStatus, loadData]
  );

  const handleAdd = useCallback(() => {
    // Arahkan ke halaman tambah pengunduran diri
    router.push("/pages/administrasi/pengunduran-diri/add");
  }, [router]);

  const handleDetail = useCallback(
    (id) =>
      // Arahkan ke halaman detail pengunduran diri
      router.push(
        `/pages/administrasi/pengunduran-diri/detail/${encryptIdUrl(id)}`
      ),
    [router]
  );

  const handleEdit = useCallback(
    (id) =>
      // Arahkan ke halaman edit pengunduran diri
      router.push(`/pages/administrasi/pengunduran-diri/edit/${encryptIdUrl(id)}`),
    [router]
  );

  // Ganti handleToggle menjadi handleUpload (untuk mengupload SK)
  const handleUpload = useCallback(
    async (id) => {
      // Logika untuk upload SK atau aksi lain yang diwakili oleh ikon upload
      const result = await SweetAlert({
        title: "Upload SK Pengunduran Diri",
        text: "Apakah Anda yakin ingin mengupload atau memperbarui SK untuk pengajuan ini?",
        icon: "info",
        confirmText: "Ya, Upload!",
      });

      if (!result) return;

      // Implementasi fungsi upload SK di sini
      Toast.success("Aksi upload SK sedang diproses...");
      // loadData(currentPage, sortBy, search, sortStatus); // Muat ulang data setelah aksi
    },
    []
  );

  useEffect(() => {
    setIsClient(true);

    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("./auth/login");
      return;
    }
    
    loadData(1, sortBy, search, sortStatus); 
  }, [ssoData, router, loadData, sortBy, search, sortStatus]);

  const filterContent = useMemo(
    () => (
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
    ),
    [sortBy, sortStatus]
  );

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Daftar Pengajuan Pengunduran Diri" // Ubah judul
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Pengunduran Diri" },
      ]} // Ubah breadcrumb
    >
      <div>
        <Formsearch
          onSearch={handleSearch}
          onAdd={handleAdd}
          onFilter={handleFilterApply}
          showAddButton={
            // Sesuaikan permission untuk tambah pengunduran diri
            isClient && userData?.permission?.includes("undurdiri.create")
          }
          showExportButton={false}
          searchPlaceholder="Cari No. Pengajuan" // Ubah placeholder
          addButtonText="Tambah Pengajuan"
          filterContent={filterContent}
        />
      </div>
      <div className="row align-items-center g-3">
        <div className="col-12">
          <Table
            data={dataPengunduranDiri} 
            onDetail={handleDetail}
            onEdit={handleEdit}
            onUpload={handleUpload} // Ganti onToggle/onDelete menjadi onUpload
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