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
  
  // ========== PERMISSION & STATE MANAGEMENT ==========
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
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRiwayat, setShowRiwayat] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();

  // =========================
  // ROLE HANDLING - Based on ASP.NET roles
  // =========================
  let fixedRole = (userData?.role || "").toUpperCase();
  
  if (permission?.roleName) {
    fixedRole = permission.roleName.toUpperCase();
  }

  // Map roles based on ASP.NET code structure
  const isMahasiswa = fixedRole === "ROL23" || fixedRole === "MAHASISWA";
  const isProdi = fixedRole === "ROL22" || fixedRole === "PRODI";
  const isWadir1 = fixedRole === "ROL01" || fixedRole === "WADIR1";
  const isFinance = fixedRole === "ROL08" || fixedRole === "FINANCE";
  const isDAAK = fixedRole === "ROL21" || fixedRole === "DAAK";
  
  // Add support for generic ADMIN role
  const isAdmin = fixedRole === "ADMIN" || fixedRole === "ADMIN SIA" || 
                  isWadir1 || isFinance || isDAAK;

  // =========================
  // FILTER OPTIONS - Based on ASP.NET structure
  // =========================
  const dataFilterSort = [
    { Value: "tanggal_desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "tanggal_asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "id_asc", Text: "No Pengajuan [↑]" },
    { Value: "id_desc", Text: "No Pengajuan [↓]" },
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Draft", Text: "Draft" },
    { Value: "Belum Disetujui Prodi", Text: "Belum Disetujui Prodi" },
    { Value: "Belum Disetujui Wadir 1", Text: "Belum Disetujui Wadir 1" },
    { Value: "Belum Disetujui Finance", Text: "Belum Disetujui Finance" },
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageRiwayat, setCurrentPageRiwayat] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalDataRiwayat, setTotalDataRiwayat] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchRiwayat, setSearchRiwayat] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState(dataFilterStatus[0].Value);
  // ======================================================
  // LOAD DATA PENGAJUAN - Based on Controller GetAll method
  // ======================================================
  const loadData = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        console.log("=== DEBUG LOAD DATA ===");
        console.log("User Data:", userData);
        console.log("Fixed Role:", fixedRole);
        console.log("Is Mahasiswa:", isMahasiswa);
        console.log("Is Prodi:", isProdi);
        console.log("Is Wadir1:", isWadir1);
        console.log("Is Finance:", isFinance);
        console.log("Is DAAK:", isDAAK);
        console.log("Is Admin:", isAdmin);

        // Determine parameters based on role and your backend API
        let mhsId = "%"; // Default to % for SQL LIKE queries
        let statusFilter = "";
        let userId = "";
        
        if (isMahasiswa) {
          // For mahasiswa, show their own data
          mhsId = userData?.mhsId || userData?.username || "";
          statusFilter = ""; // Empty to show all their submissions
        } else if (isProdi) {
          statusFilter = "Belum Disetujui Prodi";
          userId = userData?.username || "";
          mhsId = "%"; // Prodi can see all students in their program
        } else if (isWadir1) {
          statusFilter = "Belum Disetujui Wadir 1";
          mhsId = "%"; // Wadir1 can see all
        } else if (isFinance) {
          statusFilter = "Belum Disetujui Finance";
          mhsId = "%"; // Finance can see all
        } else if (isDAAK) {
          statusFilter = "Menunggu Upload SK";
          mhsId = "%"; // DAAK can see all
        } else if (isAdmin) {
          // Generic admin can see all data - use parameters that work in Swagger
          statusFilter = "disetujui"; // Use lowercase as in Swagger
          mhsId = "%"; // Use % for wildcard
          userId = userData?.username || "";
        }

        // Map frontend role to backend role codes
        let backendRole = fixedRole;
        if (fixedRole === "ADMIN SIA" || fixedRole === "ADMIN") {
          backendRole = "ROL21"; // Use ROL21 as it works in Swagger
        }

        console.log("API Parameters:", { mhsId, statusFilter, userId, role: backendRole, search });

        // Build API URL with proper parameters matching your controller
        const params = new URLSearchParams();
        
        // Always include mhsId (even if empty, some stored procedures might need it)
        params.append('mhsId', mhsId || '%');
        
        // Only add other parameters if they have values
        if (statusFilter) params.append('status', statusFilter);
        if (userId) params.append('userId', userId);
        if (backendRole) params.append('role', backendRole);
        if (search) params.append('search', search);

        const url = `${API_LINK}CutiAkademik?${params}`;
        console.log("API URL:", url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log("Response Status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log("Raw Response:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Parsed API Response Data:", data);

        // Handle different response formats
        let actualData = data;
        if (data && typeof data === 'object') {
          // If response has a data property, use that
          if (data.data && Array.isArray(data.data)) {
            actualData = data.data;
          }
          // If response has items property, use that
          else if (data.items && Array.isArray(data.items)) {
            actualData = data.items;
          }
          // If response is wrapped in result property
          else if (data.result && Array.isArray(data.result)) {
            actualData = data.result;
          }
          // If data itself is not an array but has array properties
          else if (!Array.isArray(data)) {
            console.log("Response is object but not array, checking properties...");
            const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
            if (arrayProps.length > 0) {
              actualData = data[arrayProps[0]];
              console.log(`Using array property: ${arrayProps[0]}`);
            }
          }
        }

        if (!Array.isArray(actualData)) {
          console.log("Data is not array after processing, setting empty array");
          console.log("Actual data type:", typeof actualData);
          console.log("Actual data:", actualData);
          setDataCutiAkademik([]);
          setTotalData(0);
          return;
        }

        console.log("Processing array data:", actualData);



        const formattedData = actualData.map((item, index) => {
          // Check if it's draft based on ID format and status
          const isDraft = item.status === "Draft" || item.id === "DRAFT" || !item.id?.includes("PMA");
          const isApproved = item.status === "Disetujui";

          // Determine available actions based on role and status
          let actions = ["Detail"];
          
          const currentStatus = item.status || item.cak_status || "";
          
          if (isMahasiswa && isDraft) {
            actions = ["Detail", "Edit", "Delete", "Ajukan"];
          } else if (isProdi && currentStatus === "Belum Disetujui Prodi") {
            actions = ["Detail", "Approve", "Reject"];
          } else if (isWadir1 && currentStatus === "Belum Disetujui Wadir 1") {
            actions = ["Detail", "Approve", "Reject"];
          } else if (isFinance && currentStatus === "Belum Disetujui Finance") {
            actions = ["Detail", "Approve", "Reject"];
          } else if (isDAAK && currentStatus === "Menunggu Upload SK") {
            actions = ["Detail", "Upload", "Print"];
          } else if (isApproved) {
            actions = ["Detail", "Print"];
          }

          return {
            No: index + 1,
            id: item.id, // Use id from API response
            "No Pengajuan": item.idDisplay || item.id || "-", // Display ID
            "Tanggal Pengajuan": item.tanggal || "-",
            "No SK": item.suratNo || "-",
            "Disetujui Prodi": item.approveProdi ? "✔" : "❌",
            "Disetujui Wadir 1": item.approveDir1 ? "✔" : "❌",
            Status: item.status || "-",
            "SK Cuti Akademik": item.suratNo ? "🖨" : "-",
            Aksi: actions,
            Alignment: Array(9).fill("center"),
          };
        });

        console.log("Formatted data:", formattedData);

        setDataCutiAkademik(formattedData);
        setTotalData(formattedData.length);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error loading data:", err);
        Toast.error(`Gagal memuat data pengajuan: ${err.message}`);
        
        // Set empty data on error
        setDataCutiAkademik([]);
        setTotalData(0);
      } finally {
        setLoading(false);
      }
    },
    [fixedRole, isMahasiswa, isProdi, isWadir1, isFinance, isDAAK, isAdmin, userData, search]
  );
  // ======================================================
  // LOAD DATA RIWAYAT - Based on Controller GetRiwayat method
  // ======================================================
  const loadDataRiwayat = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        console.log("=== DEBUG LOAD RIWAYAT ===");
        console.log("Search Riwayat:", searchRiwayat);

        // Based on the riwayat stored procedure, it needs different parameters
        // The SP uses @p1 (username), @p2 (status), @p4 (search)
        let statusForRiwayat = "";
        
        if (isProdi) {
          statusForRiwayat = "Belum Disetujui Prodi";
        } else if (isWadir1) {
          statusForRiwayat = "Belum Disetujui Wadir 1";
        } else if (isFinance) {
          statusForRiwayat = "Belum Disetujui Finance";
        } else if (isDAAK) {
          statusForRiwayat = "Menunggu Upload SK";
        } else if (isAdmin) {
          // Generic admin can see all riwayat
          statusForRiwayat = "";
        }

        const params = new URLSearchParams();
        if (userData?.username) params.append('userId', userData.username);
        if (statusForRiwayat) params.append('status', statusForRiwayat);
        if (searchRiwayat) params.append('search', searchRiwayat);

        const url = `${API_LINK}CutiAkademik/riwayat?${params}`;
        console.log("Riwayat API URL:", url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log("Riwayat Response Status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Riwayat API Error Response:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log("Riwayat Raw Response:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Riwayat JSON Parse Error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Riwayat Parsed API Response:", data);

        // Handle different response formats
        let actualData = data;
        if (data && typeof data === 'object') {
          if (data.data && Array.isArray(data.data)) {
            actualData = data.data;
          } else if (data.items && Array.isArray(data.items)) {
            actualData = data.items;
          } else if (data.result && Array.isArray(data.result)) {
            actualData = data.result;
          } else if (!Array.isArray(data)) {
            const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
            if (arrayProps.length > 0) {
              actualData = data[arrayProps[0]];
            }
          }
        }

        if (!Array.isArray(actualData)) {
          console.log("Riwayat data is not array after processing");
          setDataRiwayat([]);
          setTotalDataRiwayat(0);
          return;
        }

        console.log("Processing riwayat array data:", actualData);



        const formattedData = actualData.map((item, index) => ({
          No: index + 1,
          id: item.id,
          "No Cuti Akademik": item.idDisplay || item.id || "-",
          "Tanggal Pengajuan": item.tanggal || "-",
          "Nomor SK": item.suratNo || "-",
          NIM: item.mhsId || "-",
          "Nama Mahasiswa": item.mhs_nama || "-", // This field might not be in API response
          Prodi: item.kon_singkatan || item.prodi || "-", // This field might not be in API response
          Aksi: ["Detail", "Print"],
          Alignment: Array(8).fill("center"),
        }));

        console.log("Formatted riwayat data:", formattedData);

        setDataRiwayat(formattedData);
        setTotalDataRiwayat(formattedData.length);
        setCurrentPageRiwayat(page);
      } catch (err) {
        console.error("Error loading riwayat:", err);
        Toast.error(`Gagal memuat data riwayat: ${err.message}`);
        
        // Set empty data on error
        setDataRiwayat([]);
        setTotalDataRiwayat(0);
      } finally {
        setLoading(false);
      }
    },
    [userData, searchRiwayat, isProdi, isWadir1, isFinance, isDAAK, isAdmin]
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

      // Use the generate-id endpoint from your controller: PUT /api/CutiAkademik/generate-id
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
        loadData(1);
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
      console.log("Search query:", query);
      setSearch(query);
      setCurrentPage(1); // Reset to first page when searching
      loadData(1);
    },
    [loadData]
  );

  const handleSearchRiwayat = useCallback(
    (query) => {
      setSearchRiwayat(query);
      setCurrentPageRiwayat(1); // Reset to first page when searching
      loadDataRiwayat(1);
    },
    [loadDataRiwayat]
  );

  const handleFilterApply = useCallback(() => {
    setSortBy(sortRef.current.value);
    setSortStatus(statusRef.current.value);
    loadData(1);
  }, [loadData]);

  const handleNavigation = useCallback(
    (page) => loadData(page),
    [loadData]
  );

  const handleNavigationRiwayat = useCallback(
    (page) => loadDataRiwayat(page),
    [loadDataRiwayat]
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
      // Use DELETE endpoint from your controller: DELETE /api/CutiAkademik/{id}
      const url = `${API_LINK}CutiAkademik/${id}`;

      const res = await fetch(url, { method: "DELETE" });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Check for success based on your controller response
      if (data.message && data.message.includes("berhasil")) {
        Toast.success(data.message);
        loadData(1);
      } else {
        throw new Error(data.message || "Gagal menghapus pengajuan");
      }
    } catch (err) {
      console.error("Delete error:", err);
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Approve/Reject actions - These need to be implemented in the controller
  const handleApprove = async (itemId) => {
    const confirm = await SweetAlert({
      title: "Setujui Pengajuan",
      text: "Yakin ingin menyetujui pengajuan ini?",
      icon: "question",
      confirmText: "Ya, Setujui!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    setLoading(true);

    try {
      console.log("Approve ID:", itemId);
      // TODO: Add approve endpoint to controller
      // For now, show message that feature needs to be implemented
      Toast.info("Fitur approve belum diimplementasi di controller. Silakan tambahkan endpoint approve.");
      
      // When implemented, use:
      // const url = `${API_LINK}CutiAkademik/approve`;
      // const payload = { id: itemId, username: userData?.username || "", role: fixedRole };
      // const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (itemId) => {
    const { value: reason } = await SweetAlert({
      title: "Tolak Pengajuan",
      text: "Masukkan alasan penolakan:",
      input: "textarea",
      inputPlaceholder: "Alasan penolakan...",
      showCancelButton: true,
      confirmText: "Tolak",
      cancelText: "Batal",
      confirmButtonColor: "#dc3545",
    });

    if (!reason) return;

    setLoading(true);

    try {
      console.log("Reject ID:", itemId, "Reason:", reason);
      // TODO: Add reject endpoint to controller
      // For now, show message that feature needs to be implemented
      Toast.info("Fitur reject belum diimplementasi di controller. Silakan tambahkan endpoint reject.");
      
      // When implemented, use:
      // const url = `${API_LINK}CutiAkademik/reject`;
      // const payload = { id: itemId, username: userData?.username || "", role: fixedRole, reason: reason };
      // const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (id) => {
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/upload/${encryptIdUrl(
        id
      )}`
    );
  };

  const handlePrint = (id) => {
    // Use the file endpoint from your controller: GET /api/CutiAkademik/file/{filename}
    window.open(`${API_LINK}CutiAkademik/file/${id}`, "_blank");
  };




  // ======================================================
  // FIRST LOAD - Based on ASP.NET Page_Load logic
  // ======================================================
  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    if (!userData) return;



    // Load data based on role (similar to ASP.NET loadData() method)
    loadData(1);
    
    // Show riwayat panel for admin roles (based on ASP.NET panelRiwayat.Visible logic)
    if (isProdi || isWadir1 || isFinance || isDAAK || isAdmin) {
      setShowRiwayat(true);
      loadDataRiwayat(1);
    }
  }, [ssoData, userData, loadData, loadDataRiwayat, isProdi, isWadir1, isFinance, isDAAK, isAdmin, router]);

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


      {/* Panel Data Pengajuan - Based on ASP.NET panelData */}
      <div className="mb-4">
        <h5>Daftar Pengajuan Cuti Akademik</h5>
        
        <Formsearch
          onSearch={!isMahasiswa ? handleSearch : null}
          onAdd={isMahasiswa ? handleAdd : null}
          onFilter={!isMahasiswa ? handleFilterApply : null}
          onExport={
            !isMahasiswa ? () => window.open(`${API_LINK}CutiAkademik/riwayat/excel`, "_blank") : null
          }
          showAddButton={isMahasiswa}
          searchPlaceholder="Cari No. Pengajuan"
          addButtonText="Ajukan Cuti Akademik"
          filterContent={!isMahasiswa ? filterContent : null}
        />

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Memuat data pengajuan...</p>
          </div>
        ) : dataCutiAkademik.length > 0 ? (
          <>
            <Table
              data={dataCutiAkademik}
              onDetail={handleDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAjukan={handleAjukan}
              onApprove={handleApprove}
              onReject={handleReject}
              onUpload={handleUpload}
              onPrint={handlePrint}
            />

            {totalData > 0 && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPage}
                totalData={totalData}
                navigation={handleNavigation}
              />
            )}
          </>
        ) : (
          <div className="text-center py-5">
            <div className="mb-3">
              <i className="fas fa-inbox fa-3x text-muted"></i>
            </div>
            <h5 className="text-muted">Tidak ada data pengajuan</h5>
            <p className="text-muted">
              {isMahasiswa 
                ? "Anda belum memiliki pengajuan cuti akademik. Klik tombol 'Ajukan Cuti Akademik' untuk membuat pengajuan baru."
                : "Tidak ada pengajuan cuti akademik yang perlu ditinjau saat ini."
              }
            </p>
          </div>
        )}
      </div>

      {/* Panel Riwayat - Based on ASP.NET panelRiwayat */}
      {showRiwayat && (
        <div className="mt-5">
          <h5>Daftar Riwayat Cuti Akademik</h5>
          
          <Formsearch
            onSearch={handleSearchRiwayat}
            searchPlaceholder="Pencarian"
            showAddButton={false}
            showFilterButton={false}
            showExportButton={false}
          />

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Memuat data riwayat...</p>
            </div>
          ) : dataRiwayat.length > 0 ? (
            <>
              <Table
                data={dataRiwayat}
                onDetail={handleDetail}
                onPrint={handlePrint}
              />

              {totalDataRiwayat > 0 && (
                <Paging
                  pageSize={pageSize}
                  pageCurrent={currentPageRiwayat}
                  totalData={totalDataRiwayat}
                  navigation={handleNavigationRiwayat}
                />
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="fas fa-history fa-3x text-muted"></i>
              </div>
              <h5 className="text-muted">Tidak ada data riwayat</h5>
              <p className="text-muted">Belum ada riwayat cuti akademik yang tersedia.</p>
            </div>
          )}
        </div>
      )}
    </MainContent>
  );
}