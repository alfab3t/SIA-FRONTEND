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
  const isProdi = fixedRole === "ROL22" || fixedRole === "PRODI" || fixedRole === "NDA-PRODI" || fixedRole === "NDA_PRODI";
  const isWadir1 = fixedRole === "ROL01" || fixedRole === "WADIR1";
  const isFinance = fixedRole === "ROL08" || fixedRole === "FINANCE" || fixedRole === "USER-FINANCE" || fixedRole === "USER_FINANCE";
  const isDAAK = fixedRole === "ROL21" || fixedRole === "DAAK";
  
  // Add support for generic ADMIN role and KARYAWAN (staff) role
  const isAdmin = fixedRole === "ADMIN" || fixedRole === "ADMIN SIA" || fixedRole === "KARYAWAN" ||
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
        // PENGAJUAN section should only show PENDING items (not approved/completed)
        let mhsId = "%"; // Default to % for SQL LIKE queries
        let statusFilter = "";
        let userId = "";
        
        if (isMahasiswa) {
          // For mahasiswa, show their own PENDING data only
          mhsId = userData?.mhsId || userData?.username || "";
          statusFilter = ""; // Will filter out approved in frontend
        } else if (isProdi) {
          // Check if it's NDA-PRODI (should see all data like admin) or regular PRODI (only their approval items)
          if (fixedRole === "NDA-PRODI" || fixedRole === "NDA_PRODI") {
            // NDA-PRODI sees ALL pending data like admin
            statusFilter = ""; // Will filter in frontend to exclude "Disetujui"
            mhsId = "%";
            userId = "";
          } else {
            // Regular Prodi sees only items waiting for their approval
            statusFilter = "Belum Disetujui Prodi";
            userId = userData?.username || "";
            mhsId = "%";
          }
        } else if (isWadir1) {
          // Wadir1 sees only items waiting for their approval
          statusFilter = "Belum Disetujui Wadir 1";
          mhsId = "%";
        } else if (isFinance) {
          // Finance sees only items waiting for their approval
          statusFilter = "Belum Disetujui Finance";
          mhsId = "%";
        } else if (isDAAK) {
          // DAAK sees items waiting for SK upload
          statusFilter = "Menunggu Upload SK";
          mhsId = "%";
        } else if (isAdmin) {
          // Admin sees ALL PENDING items (not approved ones)
          // This will show items that need action, not completed ones
          statusFilter = ""; // Will filter in frontend to exclude "Disetujui"
          mhsId = "%";
          userId = "";
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

        // FILTER: For PENGAJUAN section with mahasiswa-specific logic
        const pendingData = actualData.filter(item => {
          const currentStatus = item.status || item.cak_status || "";
          
          if (isMahasiswa) {
            // MAHASISWA: Show ONLY their own draft entries
            if (currentStatus === "Draft") {
              return true; // Show only draft entries for mahasiswa
            }
            return false; // Hide all non-draft entries for mahasiswa
          } else {
            // ADMIN/STAFF: Original logic - exclude approved items
            // Approved items should only appear in RIWAYAT section
            if (currentStatus === "Disetujui") {
              return false;
            }
            // Include all pending statuses in pengajuan list
            return true;
          }
        });

        console.log("Filtered pending data:", pendingData);

        // Apply pagination to pending data
        const totalPendingItems = pendingData.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedPendingData = pendingData.slice(startIndex, endIndex);

        const formattedData = paginatedPendingData.map((item, index) => {
          // Check if it's draft based on ID format and status
          const isDraft = item.status === "Draft" || item.id === "DRAFT" || !item.id?.includes("PMA");
          const isApproved = item.status === "Disetujui";

          // Determine available actions based on role and status
          let actions = ["Detail"];
          
          const currentStatus = item.status || item.cak_status || "";
          const hasUploadedSK = item.srt_no || item.suratNo || item.cak_srt_no;
          
          if (isMahasiswa) {
            if (isDraft) {
              actions = ["Detail", "Edit", "Delete", "Ajukan", "Upload"];
            } else {
              actions = ["Detail", "Upload"]; // Mahasiswa can view and upload SK
            }
          } else if (isProdi) {
            if (currentStatus === "Belum Disetujui Prodi") {
              actions = ["Detail", "Approve", "Reject", "Upload"];
            } else {
              actions = ["Detail", "Upload"];
            }
          } else if (isWadir1) {
            if (currentStatus === "Belum Disetujui Wadir 1") {
              actions = ["Detail", "Approve", "Reject", "Upload"];
            } else {
              actions = ["Detail", "Upload"];
            }
          } else if (isFinance) {
            if (currentStatus === "Belum Disetujui Finance") {
              actions = ["Detail", "Approve", "Reject", "Upload"];
            } else {
              actions = ["Detail", "Upload"];
            }
          } else if (isDAAK || isAdmin) {
            // DAAK/Admin has Detail and Upload actions for all items
            actions = ["Detail", "Upload"];
          }

          // Format approval status display based on API response format
          const formatApprovalStatus = (approved, currentStatus, approvalType) => {
            console.log(`${approvalType} approval value:`, approved, "Status:", currentStatus);
            
            // FIRST: Check if status indicates rejection for this approval type
            if (currentStatus && currentStatus.includes("Ditolak")) {
              if (approvalType === "Prodi" && currentStatus.includes("Prodi")) {
                return "❌"; // Red X - rejected by Prodi
              }
              if (approvalType === "Wadir" && (currentStatus.includes("Wadir") || currentStatus.includes("Dir"))) {
                return "❌"; // Red X - rejected by Wadir
              }
            }
            
            // SECOND: If approval field contains a username/value AND not rejected, it means approved
            if (approved && approved !== "" && approved !== null && approved !== undefined) {
              // Only show approved if the overall status is "Disetujui" or if this specific approval passed
              if (currentStatus === "Disetujui" || 
                  (approvalType === "Prodi" && !currentStatus.includes("Ditolak Prodi")) ||
                  (approvalType === "Wadir" && !currentStatus.includes("Ditolak Wadir"))) {
                return "✅"; // Green checkmark - approved
              }
            }
            
            // THIRD: For empty/null values or pending status, show dash
            return "-"; // Pending/not yet processed
          };

          // Format SK Cuti Akademik column - always show print icon
          const formatSKColumn = (skNo) => {
            return "🖨️ Cetak SK"; // Always show print icon for SK
          };

          // Debug: Log the item structure to understand the data format
          if (index === 0) {
            console.log("Sample item structure:", item);
            console.log("Available keys:", Object.keys(item));
          }

          // Get No SK value - based on your API response structure
          const noSK = item.suratNo || "";
          
          // Get approval values - based on your API response structure
          const prodiApproval = item.approveProdi || item.approve_prodi || item.cak_approval_prodi;
          const wadirApproval = item.approveDir1 || item.approve_dir1 || item.cak_approval_dir1;

          return {
            No: startIndex + index + 1, // Correct numbering across pages
            id: item.cak_id || item.id || item.idDisplay, // Use cak_id as primary identifier
            "No Pengajuan": item.id || item.idDisplay || item.cak_id || "-", // Display the pengajuan number
            "Tanggal Pengajuan": item.tanggal || item.cak_created_date || "-",
            "No SK": noSK || "-", // Show the actual SK number, or "-" if empty
            "Disetujui Prodi": formatApprovalStatus(prodiApproval, currentStatus, "Prodi"),
            "Disetujui Wadir 1": formatApprovalStatus(wadirApproval, currentStatus, "Wadir"),
            Status: currentStatus || "-",
            "SK Cuti Akademik": formatSKColumn(noSK),
            Aksi: actions,
            Alignment: Array(9).fill("center"), // Back to original 9 columns
          };
        });

        console.log("Formatted data:", formattedData);
        console.log(`Showing ${formattedData.length} items of ${totalPendingItems} total (page ${page})`);

        setDataCutiAkademik(formattedData);
        setTotalData(totalPendingItems); // Use total pending items for pagination
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
        console.log("=== LOADING RIWAYAT DATA ===");

        console.log("=== DEBUG LOAD RIWAYAT ===");
        console.log("Search Riwayat:", searchRiwayat);

        // RIWAYAT section should show completed/approved items
        // The riwayat endpoint might already filter for completed items
        let statusForRiwayat = ""; // Let the riwayat endpoint handle filtering
        
        // Different roles might see different riwayat data based on their access
        if (isProdi) {
          // Prodi might see riwayat for their program
          statusForRiwayat = "";
        } else if (isWadir1 || isFinance || isDAAK || isAdmin) {
          // Admin roles see all riwayat
          statusForRiwayat = "";
        }

        const params = new URLSearchParams();
        // For riwayat, let the backend determine what data to show
        // Don't filter by userId for admin roles
        if (!isAdmin && userData?.username) {
          params.append('userId', userData.username);
        }
        if (statusForRiwayat) params.append('status', statusForRiwayat);
        if (searchRiwayat) params.append('search', searchRiwayat);

        // Use the riwayat endpoint - it should return completed/approved items
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

        // FILTER: For RIWAYAT section, only show COMPLETED items
        // Exclude: Draft, Belum Disetujui (any), Menunggu Upload SK
        const completedData = actualData.filter(item => {
          const currentStatus = item.status || item.cak_status || "";
          
          // Only include items that are fully completed
          // Exclude all pending statuses
          const pendingStatuses = [
            "Draft",
            "Belum Disetujui Prodi", 
            "Belum Disetujui Wadir 1",
            "Belum Disetujui Finance",
            "Menunggu Upload SK"
          ];
          
          // Only show if status is NOT in pending list
          return !pendingStatuses.includes(currentStatus) && currentStatus !== "";
        });

        console.log("Filtered completed data for riwayat:", completedData);
        console.log("Sample item structure:", completedData[0]);

        // Apply pagination to completed data
        const totalItems = completedData.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = completedData.slice(startIndex, endIndex);

        // Fetch student details for each item to get nama mahasiswa and prodi
        const formattedDataPromises = paginatedData.map(async (item, index) => {
          let namaMahasiswa = "-";
          let prodi = "-";
          
          // ALWAYS fetch detail to get nama mahasiswa and prodi
          // Since the riwayat API doesn't include this information
          if (item.mhsId || item.id) {
            try {
              const detailUrl = `${API_LINK}CutiAkademik/detail?id=${item.id || item.cak_id}`;
              console.log("Fetching detail from:", detailUrl);
              
              const detailResponse = await fetch(detailUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });
              
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                console.log("Detail data for", item.id, ":", detailData);
                
                // Extract nama mahasiswa from detail response
                // Based on actual API response structure
                namaMahasiswa = detailData.mahasiswa ||           // Primary field from API
                               detailData.mhs_nama || 
                               detailData.namaMahasiswa || 
                               detailData.nama_mahasiswa || 
                               detailData.mahasiswaNama ||
                               detailData.nama ||
                               detailData.name || "-";
                
                // Extract prodi from detail response
                // Based on actual API response structure
                prodi = detailData.konsentrasi ||                 // Primary field from API
                       detailData.prodiNama ||                    // Secondary field from API
                       detailData.konsentrasiSingkatan ||         // Alternative field
                       detailData.kon_singkatan || 
                       detailData.prodi || 
                       detailData.programStudi || 
                       detailData.program_studi || 
                       detailData.jurusan || "-";
                       
                console.log("Extracted - Nama:", namaMahasiswa, "Prodi:", prodi);
              } else {
                console.warn("Detail API returned:", detailResponse.status, detailResponse.statusText);
                const errorText = await detailResponse.text();
                console.warn("Detail API error body:", errorText);
              }
            } catch (error) {
              console.warn("Failed to fetch detail for", item.id, ":", error.message);
            }
          }

          return {
            No: startIndex + index + 1, // Correct numbering across pages
            id: item.cak_id || item.id,
            "No Cuti Akademik": item.id || item.cak_id || "-",
            "Tanggal Pengajuan": item.tanggal || item.cak_created_date || "-",
            "Nomor SK": item.srt_no || item.suratNo || item.cak_srt_no || "-",
            NIM: item.mhsId || item.mhs_id || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: prodi,
            Aksi: ["Detail", "Print"],
            Alignment: Array(8).fill("center"),
          };
        });

        // Wait for all detail requests to complete
        console.log("Waiting for all detail requests to complete...");
        const formattedData = await Promise.all(formattedDataPromises);

        console.log("Formatted riwayat data with student details:", formattedData);
        console.log(`Showing ${formattedData.length} items of ${totalItems} total (page ${page})`);
        
        // Log sample of nama mahasiswa to verify
        if (formattedData.length > 0) {
          console.log("Sample nama mahasiswa:", formattedData[0]["Nama Mahasiswa"]);
        }

        setDataRiwayat(formattedData);
        setTotalDataRiwayat(totalItems); // Use total items for pagination
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