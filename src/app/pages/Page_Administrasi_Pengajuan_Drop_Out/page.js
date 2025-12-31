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

export default function Page_Administrasi_Pengajuan_Drop_Out() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [dataDraft, setDataDraft] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [dataDropOut, setDataDropOut] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  // Modal Upload SK
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [fileSK, setFileSK] = useState(null);
  const [fileSuratKeterangan, setFileSuratKeterangan] = useState(null);
  const [uploading, setUploading] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();
  const isInitialized = useRef(false);

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
      role.includes("FINANCE") ||
      role.includes("WADIR") ||
      role.includes("DIREKTUR") ||
      role.includes("USER_FINANCE")
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
          setDataDropOut([]);
          return;
        }

        const params = {
          username,
          keyword,
          sortBy: sort,
          konsentrasi: "",
          role,
          displayName: role.toUpperCase().includes("ADMIN") || role.toUpperCase().includes("FINANCE") ? "" : displayName
        };

        const response = await fetchData(
          API_LINK + "DropOut/riwayat",
          params,
          "GET"
        );

        // Extract data dari response
        let list = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (response && typeof response === 'object') {
          list = response.data || response.result || response.items || response.list || [];
          if (list.length === 0) {
            const values = Object.values(response);
            const arrayValue = values.find(val => Array.isArray(val));
            if (arrayValue) {
              list = arrayValue;
            } else {
              const validValues = values.filter(val => val != null);
              if (validValues.length > 0 && typeof validValues[0] === 'object') {
                list = validValues;
              }
            }
          }
        }

        const mapped = list.map((item, index) => {
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
            if ((status === "Menunggu Persetujuan Finance" || status === "Belum Disetujui Finance") && 
                (role.includes("FINANCE") || role.includes("USER_FINANCE"))) {
              actions = ["Detail", "Approve", "Reject"];
            } else if ((status === "Menunggu Persetujuan Wadir" || status === "Belum Disetujui Wadir 1") && 
                       role.includes("WADIR")) {
              actions = ["Detail", "Approve", "Reject"];
            } else if ((status === "Menunggu Persetujuan Direktur" || status === "Belum Disetujui Direktur") && 
                       role.includes("DIREKTUR")) {
              actions = ["Detail", "Approve", "Reject"];
            }
          }
          
          if ((canCreate || role === "NDA_PRODI") && (status === "Draft" || status === "DRAFT")) {
            actions = ["Detail", "Edit", "Delete", "Ajukan"];
          }

          return {
            No: (page - 1) * pageSize + index + 1,
            id: item.id || item.droId || "", // Gunakan item.id sebagai prioritas utama
            "No. Pengajuan DO": item.droId || "-",
            "Tanggal Pengajuan": item.tanggalPengajuan || "-",
            "Nama Mahasiswa": item.namaMahasiswa || "-",
            Prodi: item.prodi || "-",
            Status: item.status || "Draft",
            "No. SK DO": item.noSkDo || "-",
            Aksi: actions,
            Alignment: ["center", "center", "center", "left", "left", "center", "center", "center"]
          };
        });

        // Pisahkan data berdasarkan status
        const draftData = [];
        const riwayatData = [];
        const userRole = userData?.role?.toUpperCase() || "";
        
        mapped.forEach((item, index) => {
          if (item.Status === "Draft" || item.Status === "DRAFT") {
            draftData.push({ ...item, No: draftData.length + 1 });
          } else {
            riwayatData.push({ ...item, No: riwayatData.length + 1 });
          }
        });

        // Untuk Admin, sort riwayat dengan "Menunggu Upload SK" di paling atas
        if (userRole.includes("USER_ADMIN") || userRole.includes("ADMIN")) {
          riwayatData.sort((a, b) => {
            const statusA = a.Status?.toUpperCase() || "";
            const statusB = b.Status?.toUpperCase() || "";
            
            // Prioritaskan "Menunggu Upload SK"
            if (statusA.includes("MENUNGGU UPLOAD SK") && !statusB.includes("MENUNGGU UPLOAD SK")) {
              return -1;
            }
            if (!statusA.includes("MENUNGGU UPLOAD SK") && statusB.includes("MENUNGGU UPLOAD SK")) {
              return 1;
            }
            return 0;
          });
          
          // Re-number setelah sort
          riwayatData.forEach((item, idx) => {
            item.No = idx + 1;
          });
        }

        setDataDropOut(mapped);
        setDataDraft(draftData);
        setDataRiwayat(riwayatData);
        setTotalData(mapped.length);
        setCurrentPage(page);

        if (mapped.length === 0) {
          Toast.info("Tidak ada data pengajuan dropout yang ditemukan");
        }
      } catch (err) {
        Toast.error("Gagal memuat data: " + err.message);
        setDataDropOut([]);
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
    router.push(`/pages/Page_Administrasi_Pengajuan_Drop_Out/detail/${encodedId}`);
  };

  const handleEdit = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/Page_Administrasi_Pengajuan_Drop_Out/edit/${encodedId}`);
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
      const response = await fetchData(
        API_LINK + `DropOut/approve/${id}`,
        {},
        "PUT"
      );

      if (response) {
        Toast.success("Pengajuan berhasil disetujui");
        loadData(); // Reload data
      }
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
      const response = await fetchData(
        API_LINK + `DropOut/reject/${id}`,
        {},
        "PUT"
      );

      if (response) {
        Toast.success("Pengajuan berhasil ditolak");
        loadData(); // Reload data
      }
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
      const response = await fetchData(
        API_LINK + `DropOut/draft/${id}/generate-id`,
        {},
        "PUT"
      );

      if (response) {
        Toast.success("Draft berhasil diajukan dengan ID: " + response.id);
        loadData(); // Reload data
      }
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
      // Endpoint sesuai Swagger: DELETE /api/DropOut/{id}
      const response = await fetchData(
        API_LINK + `DropOut/${encodeURIComponent(id)}`,
        {},
        "DELETE"
      );

      if (response) {
        Toast.success("Draft pengajuan berhasil dihapus");
        loadData(); // Reload data
      }
    } catch (err) {
      Toast.error("Gagal menghapus draft: " + err.message);
    }
  };

  const handleUploadSK = (id) => {
    setUploadId(id);
    setFileSK(null);
    setFileSuratKeterangan(null);
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadId(null);
    setFileSK(null);
    setFileSuratKeterangan(null);
  };

  const handleSubmitUpload = async () => {
    if (!fileSK) {
      Toast.error("File SK Drop Out wajib diunggah");
      return;
    }
    if (!fileSuratKeterangan) {
      Toast.error("File Surat Keterangan Pernah Berkuliah wajib diunggah");
      return;
    }

    try {
      setUploading(true);

      // Sesuai Swagger: PUT dengan JSON body
      const requestBody = {
        droId: uploadId,
        sk: fileSK.name,
        skpb: fileSuratKeterangan.name,
        modifiedBy: userData?.username || ssoData?.username || "admin"
      };

      // Debug log
      console.log("=== UPLOAD SK DEBUG ===");
      console.log("Request body:", requestBody);
      console.log("API URL:", `${API_LINK}DropOut/upload-sk`);

      // Ambil JWT token untuk authorization
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      console.log("JWT Token exists:", !!jwtToken);

      const res = await fetch(`${API_LINK}DropOut/upload-sk`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);

      // Handle response
      const text = await res.text();
      console.log("Response text:", text);

      let result = null;
      if (text) {
        try {
          result = JSON.parse(text);
          console.log("Parsed result:", result);
        } catch (e) {
          console.log("Response bukan JSON valid");
        }
      }

      if (!res.ok) {
        Toast.error(result?.message || result?.errorMessage || `Gagal mengupload berkas (${res.status})`);
        return;
      }

      Toast.success("SK berhasil diunggah");
      handleCloseUploadModal();
      loadData();
    } catch (err) {
      Toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUnduhBerkas = async (id) => {
    try {
      // Buka URL download di tab baru
      window.open(`${API_LINK}DropOut/download-sk/${encodeURIComponent(id)}`, '_blank');
    } catch (err) {
      Toast.error("Gagal mengunduh berkas: " + err.message);
    }
  };

  const handleCetakSK = (id) => {
    // Buka URL cetak SK di tab baru
    window.open(`${API_LINK}DropOut/cetak-sk/${encodeURIComponent(id)}`, '_blank');
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
        showAddButton={canSeeDraft}
        addButtonText="Tambah Pengajuan"
        searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
        filterContent={filterContent}
      />

      {/* Tabel Draft Pengajuan - Hanya untuk user_prodi/NDA_PRODI */}
      {canSeeDraft && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              <i className="bi bi-file-earmark-plus me-2"></i>
              Daftar Pengajuan (Draft)
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
            Riwayat Pengajuan
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

      {/* Modal Upload SK */}
      {showUploadModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}
          onClick={handleCloseUploadModal}
        >
          <div 
            className="bg-white rounded-3 shadow-lg p-4"
            style={{ width: '100%', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold">Unggah Berkas SK DO</h5>
              <button 
                type="button" 
                className="btn-close"
                onClick={handleCloseUploadModal}
                aria-label="Close"
              ></button>
            </div>

            {/* Body */}
            <div className="mb-3">
              <label className="form-label">
                <strong>File SK Drop Out</strong> <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFileSK(e.target.files[0])}
              />
              <small className="text-muted">Format: PDF, JPG, PNG. Maks: 5MB</small>
            </div>

            <div className="mb-4">
              <label className="form-label">
                <strong>File Surat Keterangan Pernah Berkuliah</strong> <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFileSuratKeterangan(e.target.files[0])}
              />
              <small className="text-muted">Format: PDF, JPG, PNG. Maks: 5MB</small>
            </div>

            {/* Footer */}
            <div className="d-flex justify-content-end gap-2">
              <button 
                type="button" 
                className="btn btn-secondary px-4"
                onClick={handleCloseUploadModal}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary px-4"
                onClick={handleSubmitUpload}
                disabled={uploading}
              >
                {uploading ? "Mengunggah..." : "Unggah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainContent>
  );
}
