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
import { getSSOData, getUserData } from "@/context/user";
import SweetAlert from "@/components/common/SweetAlert";

export default function Page_Administrasi_Pengajuan_Pengunduran_Diri() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [dataDraft, setDataDraft] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [dataPengunduranDiri, setDataPengunduranDiri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();

  /* ================= FILTER ================= */

  const dataFilterSort = [
    { Value: "a.pd_created_date desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "a.pd_created_date asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "a.pd_id asc", Text: "No Pengajuan PD [↑]" },
    { Value: "mhs_nama asc", Text: "Nama Mahasiswa [↑]" }
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Draft", Text: "Draft" },
    { Value: "Belum Disetujui Prodi", Text: "Menunggu Prodi" },
    { Value: "Belum Disetujui Wadir 1", Text: "Menunggu Wadir 1" },
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" }
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");

  const canCreate = useMemo(() => {
    if (!isClient || !userData?.role) return false;
    const role = userData.role.toUpperCase();
    return (
      role.includes("MAHASISWA") ||
      role.includes("PRODI") ||
      role.includes("ADMIN") ||
      role.includes("USER_ADMIN") ||
      role === "NDA_PRODI"
    );
  }, [isClient, userData]);

  const canApprove = useMemo(() => {
    if (!isClient || !userData?.role) return false;
    const role = userData.role.toUpperCase();
    return (
      role.includes("PRODI") ||
      role.includes("WADIR") ||
      role.includes("USER_ADMIN") ||
      role === "NDA_PRODI"
    );
  }, [isClient, userData]);

  // Hanya user_prodi/NDA_PRODI yang bisa melihat Daftar Pengajuan (Draft)
  const canSeeDraft = useMemo(() => {
    if (!isClient || !userData?.role) return false;
    const role = userData.role.toUpperCase();
    return (
      role.includes("PRODI") ||
      role === "NDA_PRODI"
    );
  }, [isClient, userData]);

  const loadData = useCallback(
    async (page = 1, sort = sortBy, keyword = "", status = "") => {
      try {
        setLoading(true);

        const username = userData?.username || "";
        const role = userData?.role || "";
        const displayName = userData?.displayName || userData?.fullName || "";

        if (!username) {
          setDataPengunduranDiri([]);
          return;
        }

        const params = {
          username,
          keyword,
          sortBy: sort,
          konsentrasi: "",
          role,
          displayName: role.toUpperCase().includes("ADMIN") ? "" : displayName
        };

        // Simulasi data - ganti dengan API call yang sebenarnya
        const mockData = [
          {
            id: "043/PMA/PD/XI/2025",
            pdId: "043/PMA/PD/XI/2025",
            tanggalPengajuan: "12 Des 2025",
            noSK: "-",
            nim: "0320220118",
            namaMahasiswa: "MUHAMMAD JILBRAN",
            prodi: "MI(PM)",
            status: "Belum Disetujui Wadir 1",
            disetujuiProdi: true,
            disetujuiWadir1: false
          },
          {
            id: "042/PMA/PD/XI/2025",
            pdId: "042/PMA/PD/XI/2025",
            tanggalPengajuan: "12 Nov 2025",
            noSK: "-",
            nim: "0320220118",
            namaMahasiswa: "MUHAMMAD JILBRAN",
            prodi: "MI(PM)",
            status: "Belum Disetujui Wadir 1",
            disetujuiProdi: true,
            disetujuiWadir1: false
          },
          {
            id: "DRAFT",
            pdId: "DRAFT",
            tanggalPengajuan: "22 Des 2025",
            noSK: "-",
            nim: "0320220118",
            namaMahasiswa: "MUHAMMAD JILBRAN",
            prodi: "MI(PM)",
            status: "Draft",
            disetujuiProdi: false,
            disetujuiWadir1: false
          }
        ];

        const mapped = mockData.map((item, index) => {
          const role = userData?.role?.toUpperCase() || "";
          const status = item.status || "";
          
          let actions = ["Detail"]; // Semua item minimal punya Detail
          
          // Status Disetujui - Detail dan Unduh Berkas
          if (status === "Disetujui" || status === "DISETUJUI") {
            actions = ["Detail", "Unduh Berkas"];
          }
          // User Admin - Cetak SK dan Unggah Berkas untuk status "Menunggu Upload SK"
          else if ((role.includes("USER_ADMIN") || role.includes("ADMIN")) && 
                   (status === "Menunggu Upload SK" || status === "MENUNGGU UPLOAD SK")) {
            actions = ["Detail", "Cetak SK", "Unggah Berkas"];
          }
          else if (canApprove) {
            if ((status === "Belum Disetujui Prodi" || status === "BELUM DISETUJUI PRODI") && 
                (role.includes("PRODI") || role === "NDA_PRODI")) {
              actions = ["Detail", "Approve", "Reject"];
            } else if ((status === "Belum Disetujui Wadir 1" || status === "BELUM DISETUJUI WADIR 1") && 
                       role.includes("WADIR")) {
              actions = ["Detail", "Approve", "Reject"];
            }
          }
          
          if ((canCreate || role === "NDA_PRODI") && (status === "Draft" || status === "DRAFT")) {
            actions = ["Detail", "Edit", "Delete", "Ajukan"];
          }

          return {
            No: (page - 1) * pageSize + index + 1,
            id: item.id || item.pdId || "",
            "No Pengajuan": item.pdId || "-",
            "Tanggal Pengajuan": item.tanggalPengajuan || "-",
            "Nomor SK": item.noSK || "-",
            "NIM": item.nim || "-",
            "Nama Mahasiswa": item.namaMahasiswa || "-",
            "Prodi": item.prodi || "-",
            "Disetujui Prodi": item.disetujuiProdi ? "✓" : "✗",
            "Disetujui Wadir 1": item.disetujuiWadir1 ? "✓" : "✗",
            "Status": item.status || "Draft",
            "Aksi": actions,
            Alignment: ["center", "center", "center", "center", "center", "left", "left", "center", "center", "center", "center"]
          };
        });

        // Pisahkan data berdasarkan status
        const draftData = [];
        const riwayatData = [];
        
        mapped.forEach((item, index) => {
          if (item.Status === "Draft" || item.Status === "DRAFT") {
            draftData.push({ ...item, No: draftData.length + 1 });
          } else {
            riwayatData.push({ ...item, No: riwayatData.length + 1 });
          }
        });

        setDataPengunduranDiri(mapped);
        setDataDraft(draftData);
        setDataRiwayat(riwayatData);
        setTotalData(mapped.length);
        setCurrentPage(page);

        if (mapped.length === 0) {
          Toast.info("Tidak ada data pengajuan pengunduran diri yang ditemukan");
        }
      } catch (err) {
        Toast.error("Gagal memuat data: " + err.message);
        setDataPengunduranDiri([]);
        setDataDraft([]);
        setDataRiwayat([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, sortBy, userData, canCreate, canApprove]
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
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri/detail/${encodedId}`);
  };

  const handleEdit = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri/edit/${encodedId}`);
  };

  const handleApprove = async (id) => {
    const confirm = await SweetAlert({
      title: "Setujui Pengajuan",
      text: "Apakah Anda yakin ingin menyetujui pengajuan ini?",
      icon: "info",
      confirmText: "Ya, Setujui!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      // Simulasi API call
      Toast.success("Pengajuan berhasil disetujui");
      loadData(); // Reload data
    } catch (err) {
      Toast.error("Gagal menyetujui pengajuan: " + err.message);
    }
  };

  const handleReject = async (id) => {
    const confirm = await SweetAlert({
      title: "Tolak Pengajuan",
      text: "Apakah Anda yakin ingin menolak pengajuan ini?",
      icon: "warning",
      confirmText: "Ya, Tolak!",
      confirmButtonColor: "#dc3545",
    });

    if (!confirm) return;

    try {
      // Simulasi API call
      Toast.success("Pengajuan berhasil ditolak");
      loadData(); // Reload data
    } catch (err) {
      Toast.error("Gagal menolak pengajuan: " + err.message);
    }
  };

  const handleAjukan = async (id) => {
    const confirm = await SweetAlert({
      title: "Ajukan Pengajuan",
      text: "Setelah diajukan, data tidak dapat diedit kembali. Ajukan sekarang?",
      icon: "warning",
      confirmText: "Ya, Ajukan!",
      confirmButtonColor: "#1e88e5",
    });

    if (!confirm) return;

    try {
      // Simulasi API call
      Toast.success("Draft berhasil diajukan");
      loadData(); // Reload data
    } catch (err) {
      Toast.error("Gagal mengajukan draft: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirm = await SweetAlert({
      title: "Hapus Pengajuan",
      text: "Yakin ingin menghapus pengajuan ini?",
      icon: "warning",
      confirmText: "Ya, Hapus!",
      confirmButtonColor: "#d33",
    });

    if (!confirm) return;

    try {
      // Simulasi API call
      Toast.success("Draft pengajuan berhasil dihapus");
      loadData(); // Reload data
    } catch (err) {
      Toast.error("Gagal menghapus draft: " + err.message);
    }
  };

  const handleUploadSK = (id) => {
    // Redirect ke halaman upload SK
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri/upload-sk/${encodedId}`);
  };

  const handleUnduhBerkas = async (id) => {
    try {
      // Buka URL download di tab baru
      window.open(`${API_LINK}PengunduranDiri/download-sk/${encodeURIComponent(id)}`, '_blank');
    } catch (err) {
      Toast.error("Gagal mengunduh berkas: " + err.message);
    }
  };

  const handleCetakSK = (id) => {
    // Buka URL cetak SK di tab baru
    window.open(`${API_LINK}PengunduranDiri/cetak-sk/${encodeURIComponent(id)}`, '_blank');
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
      title="Pengajuan Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Pengunduran Diri" }
      ]}
    >
      <Formsearch
        onSearch={handleSearch}
        onAdd={() =>
          router.push("/pages/Page_Administrasi_Pengajuan_Pengunduran_Diri/add")
        }
        onFilter={handleFilterApply}
        showAddButton={canSeeDraft}
        addButtonText="Tambah Pengajuan Pengunduran Diri Mahasiswa"
        searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
        filterContent={filterContent}
      />

      {/* Tabel Draft Pengajuan - Hanya untuk user_prodi/NDA_PRODI */}
      {canSeeDraft && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              <i className="bi bi-file-earmark-plus me-2"></i>
              Daftar Pengajuan Pengunduran Diri
            </h5>
            <span className="badge bg-secondary">
              {dataDraft.length} pengajuan
            </span>
          </div>
          
          <Table
            data={dataDraft}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            onAjukan={handleAjukan}
            onUnggahBerkas={handleUploadSK}
            onUnduhBerkas={handleUnduhBerkas}
            onCetakSK={handleCetakSK}
          />
        </div>
      )}

      {/* Tabel Riwayat Pengajuan */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <i className="bi bi-journal-text me-2"></i>
            Daftar Riwayat Pengajuan Pengunduran Diri
          </h5>
          <span className="badge bg-primary">
            {dataRiwayat.length} pengajuan
          </span>
        </div>
        
        <Table
          data={dataRiwayat}
          onDetail={handleDetail}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onReject={handleReject}
          onAjukan={handleAjukan}
          onUnggahBerkas={handleUploadSK}
          onUnduhBerkas={handleUnduhBerkas}
          onCetakSK={handleCetakSK}
        />
      </div>

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