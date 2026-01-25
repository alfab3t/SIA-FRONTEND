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
import * as XLSX from "xlsx";
import { hasPermission } from "@/lib/permission-utils";
export default function Page_Administrasi_Pengajuan_Pengunduran_Diri() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);
  const [dataDraft, setDataDraft] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const sortRef = useRef();
  const statusRef = useRef();
  const dataFilterSort = [
    { Value: "a.pd_created_date desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "a.pd_created_date asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "a.pd_id asc", Text: "No Pengajuan PD [↑]" },
    { Value: "mhs_nama asc", Text: "Nama Mahasiswa [↑]" }
  ];
  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Draft", Text: "Draft" },
    { Value: "Belum Disetujui Prodi", Text: "Belum Disetujui Prodi" },
    { Value: "Ditolak Prodi", Text: "Ditolak Prodi" },
    { Value: "Belum Disetujui Wadir 1", Text: "Belum Disetujui Wadir 1" },
    { Value: "Ditolak Wadir 1", Text: "Ditolak Wadir 1" },
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Dihapus", Text: "Dihapus" }
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageRiwayat, setCurrentPageRiwayat] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10 rows per table
  const pageSizeOptions = [
    { Value: 10, Text: "10 per halaman" },
    { Value: 25, Text: "25 per halaman" },
    { Value: 50, Text: "50 per halaman" },
    { Value: 100, Text: "100 per halaman" },
    { Value: 999999, Text: "Tampilkan Semua" }
  ];
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");
  const roleId = userData?.roleId || "";
  const isMahasiswa = roleId === "ROL23";
  const isProdi = roleId === "ROL71";
  const isWadir1 = roleId === "ROL999";
  const isFinance = roleId === "ROL01";
  const isAdmin = roleId === "ROL21";
  const isUserAdmin = isAdmin; // Alias untuk konsistensi dengan kode lama
  const canCreate = useMemo(() => {
    if (!isClient || !roleId) return false;
    return isMahasiswa || isProdi || isAdmin;
  }, [isClient, roleId, isMahasiswa, isProdi, isAdmin]);
  const canSeeDraft = useMemo(() => {
    if (!isClient || !roleId) return false;
    return isProdi;
  }, [isClient, roleId, isProdi]);
  const [checkingTanggungan, setCheckingTanggungan] = useState(true); // Default true saat loading
  const [bebasTanggungan, setBebasTanggungan] = useState(true);
  const checkBebasTanggunganMahasiswa = useCallback(async () => {
    if (!isMahasiswa || !userData?.username) {
      setCheckingTanggungan(false);
      return;
    }
    try {
      setCheckingTanggungan(true);
      const mhsId = userData?.nim || userData?.username || "";
      const response = await fetchData(
        API_LINK + `PengunduranDiri/mahasiswa/${encodeURIComponent(mhsId)}/bebas-tanggungan`,
        {},
        "GET"
      );
      let isBebas = false;
      if (response && typeof response === 'object') {
        isBebas = response.isBebasTanggungan === true;
      } else if (typeof response === 'boolean') {
        isBebas = response;
      }
      setBebasTanggungan(isBebas);
    } catch (err) {
      console.error("Error checking bebas tanggungan:", err);
      setBebasTanggungan(false);
    } finally {
      setCheckingTanggungan(false);
    }
  }, [userData, isMahasiswa]);
  const handleTambahClick = () => {
    router.push("/pages/administrasi-akademik/pengunduran-diri/add");
  };
  const extractArrayFromResponse = (response) => {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const data = response.data || response.result || response.items || response.list || [];
      if (data.length > 0) return data;
      const arrayValue = Object.values(response).find(val => Array.isArray(val));
      return arrayValue || [];
    }
    return [];
  };
  const mapItemForFinance = (item, idx) => {
    const itemStatus = item.status || item.Status || "";
    const pdId = item.pdiId || item.idAlternative || item.id || "-";
    const nim = item.mhsId || item.nim || "-";
    const namaMhs = item.namaMahasiswa || "-";
    const prodi = item.konsentrasi || "-";
    const tanggal = item.tanggal || item.tanggalPengajuan || "-";
    const noSK = item.suratNo || item.noSK || "-";
    return {
      No: idx + 1,
      id: pdId,
      "No Pengajuan": pdId,
      "Tanggal Pengajuan": tanggal,
      "Nomor SK": noSK,
      "NIM": nim,
      "Nama Mahasiswa": namaMhs,
      "Prodi": prodi,
      "Status": itemStatus || "Disetujui",
      "Aksi": ["Detail", "Unduh Berkas"],
      Alignment: ["center", "center", "center", "center", "center", "left", "left", "center", "center"]
    };
  };
  const loadDataForFinance = async (keyword, sort) => {
    try {
      const riwayatParams = {
        status: "Disetujui",
        keyword: keyword || "",
        orderBy: sort || "",
        konsentrasi: ""
      };
      const riwayatResponse = await fetchData(API_LINK + "PengunduranDiri/riwayat", riwayatParams, "GET");
      const riwayatDataFromApi = extractArrayFromResponse(riwayatResponse);
      const riwayatData = riwayatDataFromApi.map(mapItemForFinance);
      setDataDraft([]);
      setDataRiwayat(riwayatData);
      setCurrentPage(1);
      return true;
    } catch (err) {
      console.error("Error fetching riwayat for Finance:", err);
      setDataDraft([]);
      setDataRiwayat([]);
      return false;
    }
  };
  const fetchDataForAdmin = async (username, keyword, sort) => {
    const [pengajuanResponse, riwayatResponse] = await Promise.all([
      fetchData(API_LINK + "PengunduranDiri", { p1: username, status: "Menunggu Upload SK", userId: username }, "GET").catch(err => {
        console.error("Error fetching Menunggu Upload SK:", err);
        return [];
      }),
      fetchData(API_LINK + "PengunduranDiri/riwayat", { status: "Disetujui", keyword: keyword || "", orderBy: sort || "", konsentrasi: "" }, "GET").catch(() => [])
    ]);
    return {
      allData: extractArrayFromResponse(pengajuanResponse),
      riwayatDataFromApi: extractArrayFromResponse(riwayatResponse)
    };
  };
  const fetchDataForNonAdmin = async (nim, username, isMahasiswa, isProdi, userData) => {
    let statusesToFetch = [];
    if (isMahasiswa) {
      statusesToFetch = ["Draft", "Belum Disetujui Prodi", "Belum Disetujui Wadir 1", "Menunggu Upload SK"];
    } else if (isProdi) {
      statusesToFetch = ["Draft", "Belum Disetujui Prodi", "Belum Disetujui Wadir 1", "Menunggu Upload SK"];
    } else {
      statusesToFetch = ["Belum Disetujui Wadir 1", "Menunggu Upload SK"];
    }
    const fetchPromises = statusesToFetch.map((statusItem) => {
      if (isProdi && statusItem === "Belum Disetujui Prodi") {
        // Prodi melihat semua data "Belum Disetujui Prodi" dari semua prodi
        return fetchData(API_LINK + "PengunduranDiri", { status: statusItem, konsentrasi: "" }, "GET")
          .then(response => Array.isArray(response) ? response : [])
          .catch(() => []);
      }
      const params = isMahasiswa 
        ? { p1: nim, status: statusItem }
        : { p1: username, status: statusItem, userId: username };
      return fetchData(API_LINK + "PengunduranDiri", params, "GET")
        .then(response => Array.isArray(response) ? response : [])
        .catch(() => []);
    });
    const riwayatParams = {
      username: username,
      keyword: "",
      orderBy: "",
      konsentrasi: "",
      roleId: userData?.roleId || "",
      displayName: userData?.displayName || userData?.fullName || ""
    };
    if (isMahasiswa) {
      riwayatParams.mhsId = nim;
    }
    
    fetchPromises.push(
      fetchData(API_LINK + "PengunduranDiri/riwayat", riwayatParams, "GET")
        .then(response => Array.isArray(response) ? response : [])
        .catch(() => [])
    );
    const results = await Promise.all(fetchPromises);
    let allData = results.flat();
    
    const seenIds = new Set();
    allData = allData.filter(item => {
      const itemId = item.pdiId || item.id || item.idAlternative;
      if (!itemId || seenIds.has(itemId)) {
        return false;
      }
      seenIds.add(itemId);
      return true;
    });
    
    return allData;
  };
  const filterDataByKeyword = (data, keyword) => {
    if (!keyword) return data;
    const lowerKeyword = keyword.toLowerCase();
    return data.filter(item => {
      const pdId = (item.pdId || item.pdiId || "").toLowerCase();
      const nama = (item.namaMahasiswa || item.mhsNama || "").toLowerCase();
      return pdId.includes(lowerKeyword) || nama.includes(lowerKeyword);
    });
  };
  const filterDataByRole = (data, isUserAdmin, isMahasiswa, isProdi) => {
    if (isUserAdmin) return data;
    if (!isMahasiswa && !isProdi) {
      return data.filter(item => {
        const status = (item.status || "").toLowerCase();
        return status !== "draft";
      });
    }
    return data;
  };
  const loadData = useCallback(
    async (page = 1, sort = sortBy, keyword = "") => {
      try {
        setLoading(true);
        const username = ssoData?.username || userData?.username || "";
        const nim = userData?.nim || userData?.username || "";
        if (!username) {
          setDataDraft([]);
          setDataRiwayat([]);
          setLoading(false);
          return;
        }
        if (isFinance) {
          await loadDataForFinance(keyword, sort);
          setLoading(false);
          return;
        }
        let allData = [];
        let riwayatDataFromApi = [];
        
        if (isUserAdmin) {
          const result = await fetchDataForAdmin(username, keyword, sort);
          allData = result.allData;
          riwayatDataFromApi = result.riwayatDataFromApi;
        } else if (isWadir1) {
          // Untuk Wadir, fetch pengajuan dan riwayat secara terpisah
          const [pengajuanResponse, riwayatResponse] = await Promise.all([
            fetchData(API_LINK + "PengunduranDiri", { 
              p1: username, 
              status: "Belum Disetujui Wadir 1", 
              userId: username 
            }, "GET").catch(() => []),
            fetchData(API_LINK + "PengunduranDiri/riwayat", {
              status: "Belum Disetujui Wadir 1",
              keyword: keyword || "",
              orderBy: sort || "",
              konsentrasi: ""
            }, "GET").catch(() => [])
          ]);
          
          allData = extractArrayFromResponse(pengajuanResponse);
          riwayatDataFromApi = extractArrayFromResponse(riwayatResponse);
          
          console.log("🔍 Wadir - Pengajuan data:", allData);
          console.log("🔍 Wadir - Riwayat data:", riwayatDataFromApi);
        } else {
          allData = await fetchDataForNonAdmin(nim, username, isMahasiswa, isProdi, userData);
        }
        allData = filterDataByRole(allData, isUserAdmin, isMahasiswa, isProdi);
        allData = filterDataByKeyword(allData, keyword);
        const getActionsForItem = (itemStatusLower, itemId) => {
          if (itemStatusLower === "disetujui") {
            return ["Detail", "Unduh Berkas"];
          }
          if (itemStatusLower === "menunggu upload sk" && isUserAdmin) {
            return ["Detail", "Cetak SK", "Unggah Berkas"];
          }
          if (itemStatusLower === "belum disetujui prodi" && isProdi) {
            const actions = ["Detail"];
            
            const hasApprovePermission = hasPermission(userData, "pengunduran_diri.approve_reject");
            const isPermissionEmpty = !userData?.permission || userData.permission.length === 0;
            
            if (hasApprovePermission || isPermissionEmpty) {
              actions.push("Approve", "Reject");
            }
            return actions;
          }
          if (itemStatusLower === "belum disetujui wadir 1" && isWadir1) {
            console.log("✅ Wadir PD approval detected!");
            console.log("🔍 userData:", userData);
            console.log("🔍 userData.permission:", userData?.permission);
            console.log("🔍 hasPermission result:", hasPermission(userData, "pengunduran_diri.approve_reject"));
            
            const actions = ["Detail"];
            
            // Jika permission kosong atau tidak ada, tetap tampilkan untuk Wadir (fallback ke role-based)
            const hasApprovePermission = hasPermission(userData, "pengunduran_diri.approve_reject");
            const isPermissionEmpty = !userData?.permission || userData.permission.length === 0;
            
            if (hasApprovePermission || isPermissionEmpty) {
              console.log("✅ Adding Approve/Reject buttons (hasPermission:", hasApprovePermission, "isPermissionEmpty:", isPermissionEmpty, ")");
              actions.push("Approve", "Reject");
            } else {
              console.log("❌ NOT adding Approve/Reject buttons");
            }
            return actions;
          }
          if (itemStatusLower === "belum disetujui wadir 1") {
            return ["Detail"];
          }
          if (itemStatusLower === "draft" && (isMahasiswa || isProdi || isUserAdmin)) {
            const actions = ["Detail"];
            
            const hasEditPermission = hasPermission(userData, "pengunduran_diri.edit");
            const hasDeletePermission = hasPermission(userData, "pengunduran_diri.delete");
            const isPermissionEmpty = !userData?.permission || userData.permission.length === 0;
            
            if (hasEditPermission || isPermissionEmpty) {
              actions.push("Edit");
            }
            if (hasDeletePermission || isPermissionEmpty) {
              actions.push("Delete");
            }
            actions.push({
              IconName: "send-check",
              Title: "Ajukan",
              Function: async () => {
                const SweetAlert = (await import("@/components/common/SweetAlert")).default;
                const Toast = (await import("@/components/common/Toast")).default;
                const confirm = await SweetAlert({
                  title: "Ajukan Pengajuan",
                  text: "Setelah diajukan, data tidak dapat diedit kembali. Ajukan sekarang?",
                  icon: "warning",
                  confirmText: "Ya, Ajukan!",
                  confirmButtonColor: "#1e88e5",
                });
                if (!confirm) return;
                try {
                  const endpoint = isProdi 
                    ? `${API_LINK}PengunduranDiri/create-by-prodi/submit/${encodeURIComponent(itemId)}`
                    : `${API_LINK}PengunduranDiri/submit/${encodeURIComponent(itemId)}`;
                  const fetchData = (await import("@/lib/fetch")).default;
                  const response = await fetchData(endpoint, {}, "PUT");
                  if (response && !response.error) {
                    const newId = response.pdiId || response.id || response.pdId || "Berhasil";
                    Toast.success("Pengajuan berhasil diajukan dengan ID: " + newId);
                    globalThis.location.reload();
                  } else {
                    Toast.error(response?.message || "Gagal mengajukan draft");
                  }
                } catch (err) {
                  console.error("Error submitting draft:", err);
                  Toast.error("Gagal mengajukan draft: " + (err?.message || "Unknown error"));
                }
              }
            });
            return actions;
          }
          if (itemStatusLower.includes("ditolak")) {
            return ["Detail"];
          }
          return ["Detail"];
        };
        const mapItem = (item, index) => {
          const itemStatus = (item.status || item.Status || "").trim();
          const itemStatusLower = itemStatus.toLowerCase().trim();
          const itemId = item.pdiId || item.idAlternative || item.id;
          const actions = getActionsForItem(itemStatusLower, itemId);
          const pdId = item.pdiId || item.idAlternative || item.id || "-";
          const tanggal = item.tanggal || item.tanggalPengajuan || "-";
          const noSK = item.suratNo || item.noSK || "-";
          const isProdiApproved = ["belum disetujui wadir 1", "menunggu upload sk", "disetujui"].includes(itemStatusLower);
          const isWadirApproved = ["menunggu upload sk", "disetujui"].includes(itemStatusLower);
          return {
            No: index + 1,
            id: pdId,
            "No Pengajuan": pdId,
            "Tanggal Pengajuan": tanggal,
            "Nomor SK": noSK,
            "Disetujui Prodi": isProdiApproved ? "✓" : "✗",
            "Disetujui Wadir 1": isWadirApproved ? "✓" : "✗",
            "Status": itemStatus || "Draft",
            "Aksi": actions,
            Alignment: ["center", "center", "center", "center", "center", "center", "center", "center"]
          };
        };
        const mapItemAdminPengajuan = (item, index) => {
          const itemStatus = (item.status || item.Status || "").trim();
          const itemStatusLower = itemStatus.toLowerCase().trim();
          let actions = [
            "Detail", 
            {
              IconName: "printer",
              Title: "Cetak SK",
              Function: () => globalThis.open(`${API_LINK}PengunduranDiri/template-sk`, '_blank')
            },
            "Unggah Berkas"
          ];
          const pdId = item.pdiId || item.idAlternative || item.id || "-";
          const tanggal = item.tanggal || item.tanggalPengajuan || "-";
          const noSK = item.suratNo || item.noSK || "-";
          const isProdiApproved = 
            itemStatusLower === "belum disetujui wadir 1" || 
            itemStatusLower === "menunggu upload sk" || 
            itemStatusLower === "disetujui";
          const isWadirApproved = 
            itemStatusLower === "menunggu upload sk" || 
            itemStatusLower === "disetujui";
          return {
            No: index + 1,
            id: pdId,
            "No Pengajuan": pdId,
            "Tanggal Pengajuan": tanggal,
            "Nomor SK": noSK,
            "Disetujui Prodi": isProdiApproved ? "✓" : "✗",
            "Disetujui Wadir 1": isWadirApproved ? "✓" : "✗",
            "Status": itemStatus || "Draft",
            "Cetak SK": true,
            "Aksi": actions,
            Alignment: ["center", "center", "center", "center", "center", "center", "center", "center", "center"]
          };
        };
        const mapItemAdminRiwayat = (item, index) => {
          const itemStatus = item.status || item.Status || "";
          let actions = ["Detail", "Unduh Berkas"];
          const pdId = item.pdiId || item.idAlternative || item.id || "-";
          const nim = item.mhsId || item.nim || "-";
          const namaMhs = item.namaMahasiswa || "-";
          const prodi = item.konsentrasi || "-";
          const tanggal = item.tanggal || item.tanggalPengajuan || "-";
          const noSK = item.suratNo || item.noSK || "-";
          return {
            No: index + 1,
            id: pdId,
            "No Pengajuan": pdId,
            "Tanggal Pengajuan": tanggal,
            "Nomor SK": noSK,
            "NIM": nim,
            "Nama Mahasiswa": namaMhs,
            "Prodi": prodi,
            "Status": itemStatus || "Draft",
            "Aksi": actions,
            Alignment: ["center", "center", "center", "center", "center", "left", "left", "center", "center"]
          };
        };
        const separateDataByRole = (allData, riwayatDataFromApi, username, nim) => {
          const currentUsername = (username || "").toLowerCase().trim();
          const currentNim = (nim || "").toLowerCase().trim();
          if (isUserAdmin) {
            return separateDataForAdmin(allData, riwayatDataFromApi, currentUsername);
          }
          if (isMahasiswa) {
            return separateDataForMahasiswa(allData, currentNim);
          }
          if (isProdi) {
            return separateDataForProdi(allData, currentUsername);
          }
          if (isWadir1) {
            return separateDataForWadir(allData, riwayatDataFromApi);
          }
          return separateDataForOthers(allData);
        };
        const separateDataForAdmin = (allData, riwayatDataFromApi, currentUsername) => {
          const draftData = allData
            .filter(item => {
              const status = (item.status || "").toLowerCase().trim();
              const itemCreatedBy = (item.createdBy || "").toLowerCase().trim();
              if (status === "menunggu upload sk") return true;
              const isMyData = itemCreatedBy === currentUsername;
              const isValidStatus = ["draft", "belum disetujui prodi", "belum disetujui wadir 1"].includes(status);
              return isMyData && isValidStatus;
            })
            .map((item, idx) => mapItemAdminPengajuan(item, idx));
          const riwayatData = riwayatDataFromApi.map((item, idx) => mapItemAdminRiwayat(item, idx));
          return { draftData, riwayatData };
        };
        const separateDataForMahasiswa = (allData, currentNim) => {
          // Mahasiswa hanya melihat daftar pengajuan (semua status kecuali yang sudah selesai)
          const draftData = allData
            .filter(item => {
              const status = (item.status || "").toLowerCase().trim();
              const itemNim = item.mhsId || item.nim || "";
              const itemCreatedBy = (item.createdBy || "").toLowerCase().trim();
              const isMyData = itemNim.toLowerCase() === currentNim || itemCreatedBy === currentNim;
              // Tampilkan semua status untuk mahasiswa di daftar pengajuan
              return isMyData;
            })
            .map((item, idx) => mapItem(item, idx));
          
          // Mahasiswa tidak melihat riwayat
          const riwayatData = [];
          
          return { draftData, riwayatData };
        };
        const separateDataForProdi = (allData, currentUsername) => {
          console.log("🔍 separateDataForProdi - Input:");
          console.log("allData length:", allData.length);
          console.log("currentUsername:", currentUsername);
          console.log("Sample data:", allData.slice(0, 2));
          
          const draftData = allData
            .filter(item => {
              const status = (item.status || "").toLowerCase().trim();
              const itemCreatedBy = (item.createdBy || "").toLowerCase().trim();
              
              console.log("🔍 Filtering item:", {
                status,
                itemCreatedBy,
                currentUsername,
                isMatch: itemCreatedBy === currentUsername
              });
              
              if (status === "belum disetujui prodi") {
                console.log("✅ Item dengan status 'belum disetujui prodi' - INCLUDED");
                return true;
              }
              const isMyData = itemCreatedBy === currentUsername;
              const validStatuses = ["draft", "belum disetujui wadir 1", "menunggu upload sk"];
              const result = isMyData && validStatuses.includes(status);
              
              if (result) {
                console.log("✅ Item created by me with valid status - INCLUDED");
              } else {
                console.log("❌ Item EXCLUDED - isMyData:", isMyData, "validStatus:", validStatuses.includes(status));
              }
              
              return result;
            })
            .map((item, idx) => mapItem(item, idx));
            
          console.log("🔍 separateDataForProdi - Draft data length:", draftData.length);
          
          const riwayatData = allData
            .filter(item => {
              const status = (item.status || "").toLowerCase().trim();
              const validStatuses = ["disetujui", "ditolak prodi", "ditolak wadir 1"];
              return validStatuses.includes(status) || status.includes("ditolak");
            })
            .map((item, idx) => mapItem(item, idx));
            
          console.log("🔍 separateDataForProdi - Riwayat data length:", riwayatData.length);
          
          return { draftData, riwayatData };
        };
        const separateDataForWadir = (allData, riwayatDataFromApi) => {
          console.log("🔍 separateDataForWadir - Pengajuan data:", allData);
          console.log("🔍 separateDataForWadir - Riwayat data:", riwayatDataFromApi);
          
          // Data pengajuan (Belum Disetujui Wadir 1) - gunakan mapItem
          const draftData = allData.map((item, idx) => mapItem(item, idx));
          
          // Data riwayat - filter hanya yang Disetujui atau Ditolak (exclude Menunggu Upload SK)
          const riwayatData = riwayatDataFromApi
            .filter(item => {
              const status = (item.status || item.Status || "").toLowerCase();
              return status === "disetujui" || status.includes("ditolak");
            })
            .map((item, idx) => mapItemAdminRiwayat(item, idx));
          
          console.log("📊 separateDataForWadir - Draft:", draftData.length, "Riwayat:", riwayatData.length);
          
          return { draftData, riwayatData };
        };
        const separateDataForOthers = (allData) => {
          const draftData = allData
            .filter(item => {
              const status = (item.status || "").toLowerCase();
              return ["belum disetujui prodi", "belum disetujui wadir 1", "menunggu upload sk"].includes(status);
            })
            .map((item, idx) => mapItem(item, idx));
          const riwayatData = allData
            .filter(item => {
              const status = (item.status || "").toLowerCase();
              const validStatuses = ["disetujui", "ditolak prodi", "ditolak wadir 1"];
              return validStatuses.includes(status) || status.includes("ditolak");
            })
            .map((item, idx) => mapItem(item, idx));
          return { draftData, riwayatData };
        };
        const { draftData, riwayatData } = separateDataByRole(allData, riwayatDataFromApi, username, nim);
        setDataDraft(draftData);
        setDataRiwayat(riwayatData);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error loading data:", err);
        Toast.error("Gagal memuat data dari server");
        setDataDraft([]);
        setDataRiwayat([]);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, isUserAdmin, isMahasiswa, isProdi, isWadir1, isFinance]
  );
  const handleSearch = (q) => {
    setSearch(q);
  };
  const handleFilterApply = () => {
    const s = sortRef.current.value;
    const st = statusRef.current.value;
    setSortBy(s);
    setSortStatus(st);
    loadData(1, s, search);
  };
  const handleDetail = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/administrasi-akademik/pengunduran-diri/detail/${encodedId}`);
  };
  const handleEdit = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/administrasi-akademik/pengunduran-diri/edit/${encodedId}`);
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
      const username = userData?.username || "";
      let apiRole = "";
      if (isProdi) {
        apiRole = "Prodi";
      } else if (isWadir1) {
        apiRole = "Wadir1";
      }
      if (!apiRole) {
        Toast.error("Role tidak terdeteksi. Anda tidak memiliki akses untuk menyetujui pengajuan ini.");
        return;
      }
      if (!username) {
        Toast.error("Username tidak ditemukan. Silakan login ulang.");
        return;
      }
      const requestBody = {
        role: apiRole,
        approvedBy: username
      };
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      const res = await fetch(`${API_LINK}PengunduranDiri/approve?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(requestBody),
      });
      const text = await res.text();
      let result = null;
      if (text) {
        try { 
          result = JSON.parse(text); 
        } catch (e) {
          console.error("Error parsing JSON response:", e);
        }
      }
      if (res.ok) {
        Toast.success("Pengajuan berhasil disetujui");
        loadData();
      } else {
        const errorMsg = result?.message || result?.errorMessage || result?.error || text || "Gagal menyetujui pengajuan";
        Toast.error(errorMsg);
      }
    } catch (err) {
      console.error("Error approving pengajuan:", err);
      Toast.error("Gagal menyetujui pengajuan: " + (err?.message || "Unknown error"));
    }
  };
  const handleReject = async (id) => {
    setRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };
  const handleRejectSubmit = async () => {
    if (!rejectReason || rejectReason.trim() === "") {
      Toast.error("Alasan penolakan wajib diisi!");
      return;
    }
    try {
      let apiRole = "";
      if (isProdi) {
        apiRole = "Prodi";
      } else if (isWadir1) {
        apiRole = "Wadir1";
      }
      if (!apiRole) {
        Toast.error("Role tidak terdeteksi. Anda tidak memiliki akses untuk menolak pengajuan ini.");
        return;
      }
      const requestBody = {
        role: apiRole,
        reason: rejectReason.trim()
      };
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      const res = await fetch(`${API_LINK}PengunduranDiri/reject?id=${encodeURIComponent(rejectId)}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(requestBody),
      });
      const text = await res.text();
      let result = null;
      if (text) {
        try { 
          result = JSON.parse(text); 
        } catch (e) {
          console.error("Error parsing JSON response:", e);
        }
      }
      if (res.ok) {
        Toast.success("Pengajuan berhasil ditolak");
        setShowRejectModal(false);
        setRejectReason("");
        setRejectId(null);
        loadData();
      } else {
        Toast.error(result?.message || "Gagal menolak pengajuan");
      }
    } catch (err) {
      console.error("Error rejecting pengajuan:", err);
      Toast.error("Gagal menolak pengajuan: " + (err?.message || "Unknown error"));
    }
  };
  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setRejectReason("");
    setRejectId(null);
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
      let endpoint = "";
      if (isProdi) {
        endpoint = API_LINK + `PengunduranDiri/create-by-prodi/submit/${encodeURIComponent(id)}`;
      } else {
        endpoint = API_LINK + `PengunduranDiri/submit/${encodeURIComponent(id)}`;
      }
      console.log("📤 Ajukan endpoint:", endpoint);
      console.log("📤 Is Prodi:", isProdi);
      const response = await fetchData(endpoint, {}, "PUT");
      if (response && !response.error) {
        const newId = response.pdiId || response.id || response.pdId || response.newId || response.data?.pdiId || response.data?.id || "Berhasil";
        Toast.success("Pengajuan berhasil diajukan dengan ID: " + newId);
        loadData();
      } else {
        Toast.error(response?.message || "Gagal mengajukan draft");
      }
    } catch (err) {
      console.error("Error submitting draft:", err);
      Toast.error("Gagal mengajukan draft: " + (err?.message || "Unknown error"));
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
      const response = await fetchData(
        API_LINK + `PengunduranDiri/delete?id=${encodeURIComponent(id)}`,
        {},
        "DELETE"
      );
      if (response && !response.error) {
        Toast.success("Draft pengajuan berhasil dihapus");
        loadData(); // Reload data
      } else {
        Toast.error(response?.message || "Gagal menghapus draft");
      }
    } catch (err) {
      console.error("Error deleting draft:", err);
      Toast.error("Gagal menghapus draft: " + (err?.message || "Unknown error"));
    }
  };
  const handleUploadSK = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/administrasi-akademik/pengunduran-diri/upload-sk/${encodedId}`);
  };
  const handleUnduhBerkas = async (id) => {
    try {
      globalThis.open(`${API_LINK}PengunduranDiri/download-sk-file?id=${encodeURIComponent(id)}`, '_blank');
    } catch (err) {
      console.error("Error downloading berkas:", err);
      Toast.error("Gagal mengunduh berkas: " + (err?.message || "Unknown error"));
    }
  };
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setCurrentPageRiwayat(1);
    loadData(1, sortBy, search);
  };
  const handleRefresh = () => {
    setCurrentPage(1);
    setCurrentPageRiwayat(1);
    loadData(1, sortBy, search);
    Toast.info("Data sedang dimuat ulang...");
  };
  const styleExcelHeader = (worksheet, range) => {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (worksheet[address]) {
        worksheet[address].s = headerStyle;
      }
    }
  };
  const styleExcelDataRows = (worksheet, range) => {
    const baseBorder = {
      top: { style: "thin", color: { rgb: "D3D3D3" } },
      bottom: { style: "thin", color: { rgb: "D3D3D3" } },
      left: { style: "thin", color: { rgb: "D3D3D3" } },
      right: { style: "thin", color: { rgb: "D3D3D3" } }
    };
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isEvenRow = R % 2 === 0;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + (R + 1);
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          alignment: { 
            horizontal: C === 0 ? "center" : "left",
            vertical: "center" 
          },
          border: baseBorder
        };
        if (isEvenRow) {
          worksheet[address].s.fill = { fgColor: { rgb: "F2F2F2" } };
        }
      }
    }
  };
  const handleExportExcel = () => {
    try {
      const allData = [...dataDraft, ...dataRiwayat];
      if (allData.length === 0) {
        Toast.error("Tidak ada data untuk di-export");
        return;
      }
      const excelData = allData.map((item, index) => ({
        "No": index + 1,
        "No Pengajuan": item["No Pengajuan"] || "-",
        "Tanggal Pengajuan": item["Tanggal Pengajuan"] || "-",
        "Nomor SK": item["Nomor SK"] || "-",
        "NIM": item["NIM"] || "-",
        "Disetujui Prodi": item["Disetujui Prodi"] || "-",
        "Disetujui Wadir 1": item["Disetujui Wadir 1"] || "-",
        "Status": item["Status"] || "-"
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet["!cols"] = [
        { wch: 6 },   // No
        { wch: 22 },  // No Pengajuan
        { wch: 18 },  // Tanggal Pengajuan
        { wch: 25 },  // Nomor SK
        { wch: 15 },  // NIM
        { wch: 18 },  // Disetujui Prodi
        { wch: 18 },  // Disetujui Wadir 1
        { wch: 25 }   // Status
      ];
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      styleExcelHeader(worksheet, range);
      styleExcelDataRows(worksheet, range);
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pengunduran Diri");
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replaceAll(':', '-');
      const filename = `Data_Pengunduran_Diri_${dateStr}_${timeStr}.xlsx`;
      XLSX.writeFile(workbook, filename, { cellStyles: true });
      Toast.success("File Excel berhasil diunduh!");
    } catch (err) {
      console.error("Export error:", err);
      Toast.error("Gagal membuat file Excel: " + err.message);
    }
  };
  const handleCetakSK = (id) => {
    globalThis.open(`${API_LINK}PengunduranDiri/template-sk`, '_blank');
  };
  useEffect(() => {
    setIsClient(true);
    
    console.log("🔍 PENGUNDURAN DIRI - Debug Permission System:");
    console.log("userData:", userData);
    console.log("userData.permission:", userData?.permission);
    console.log("roleId:", userData?.roleId);
    console.log("isWadir1:", isWadir1);
    
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }
    Promise.all([
      loadData(1, sortBy, ""),
      checkBebasTanggunganMahasiswa()
    ]);
  }, []);
  const filteredDataRiwayat = useMemo(() => {
    if (!search || search.trim() === "") {
      return dataRiwayat;
    }
    const lowerKeyword = search.toLowerCase();
    return dataRiwayat.filter(item => {
      const noPengajuan = (item["No Pengajuan"] || "").toLowerCase();
      const nim = (item["NIM"] || "").toLowerCase();
      const status = (item["Status"] || "").toLowerCase();
      return noPengajuan.includes(lowerKeyword) || 
             nim.includes(lowerKeyword) || 
             status.includes(lowerKeyword);
    });
  }, [dataRiwayat, search]);
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
      <DropDown
        arrData={pageSizeOptions}
        label="Tampilkan"
        value={pageSize}
        onChange={(e) => handlePageSizeChange(Number.parseInt(e.target.value, 10))}
      />
    </>
  );
  const renderTanggunganOrAddButton = () => {
    if (!bebasTanggungan && !checkingTanggungan) {
      return (
        <span className="text-danger fw-bold">
          <i className="bi bi-exclamation-circle me-1" />{' '}Anda memiliki Tanggungan
        </span>
      );
    }
    if (checkingTanggungan) {
      return (
        <span className="text-muted">
          <i className="bi bi-hourglass-split me-1" />{' '}Memeriksa status tanggungan...
        </span>
      );
    }
    
    const hasCreatePermission = hasPermission(userData, "pengunduran_diri.create");
    const isPermissionEmpty = !userData?.permission || userData.permission.length === 0;
    
    if (canCreate && (hasCreatePermission || isPermissionEmpty)) {
      return (
        <button 
          className="btn btn-primary px-4"
          onClick={handleTambahClick}
        >
          <i className="bi bi-plus-lg me-1" />{' '}Tambah
        </button>
      );
    }
    return null;
  };
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
      {}
      {isUserAdmin && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Pengajuan Menunggu Upload SK</h5>
          </div>
          <Table
            data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            onDetail={handleDetail}
            onUnggahBerkas={handleUploadSK}
            onCetakSK={handleCetakSK}
          />
          {dataDraft.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={dataDraft.length}
              navigation={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      )}
      {}
      {isUserAdmin && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Riwayat Pengajuan</h5>
          </div>
          <Formsearch
            onSearch={handleSearch}
            onFilter={handleFilterApply}
            onRefresh={handleRefresh}
            onExport={handleExportExcel}
            showAddButton={false}
            showRefreshButton={true}
            showExportButton={true}
            searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
            filterContent={filterContent}
          />
          <Table
            data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
            onDetail={handleDetail}
            onUnduhBerkas={handleUnduhBerkas}
          />
          {filteredDataRiwayat.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPageRiwayat}
              totalData={filteredDataRiwayat.length}
              navigation={(p) => setCurrentPageRiwayat(p)}
            />
          )}
        </div>
      )}
      {}
      {isMahasiswa && (
        <div className="mb-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            {renderTanggunganOrAddButton()}
          </div>
          <Formsearch
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            showAddButton={false}
            showRefreshButton={true}
            showFilterButton={false}
            showExportButton={false}
            searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
          />
          <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
            <h5 className="mb-0">Daftar Pengajuan</h5>
          </div>
          <Table
            data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAjukan={handleAjukan}
            onUnduhBerkas={handleUnduhBerkas}
          />
          {dataDraft.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={dataDraft.length}
              navigation={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      )}
      {}
      {canSeeDraft && !isMahasiswa && !isUserAdmin && (
        <div className="mb-4">
          {}
          {canCreate && (
            <div className="mb-3">
              <button 
                className="btn btn-primary px-4"
                onClick={() => router.push("/pages/administrasi-akademik/pengunduran-diri/add")}
              >
                <i className="bi bi-plus-lg me-1" />{' '}Tambah
              </button>
            </div>
          )}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Pengajuan Pengunduran Diri</h5>
          </div>
          <Table
            data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
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
          {dataDraft.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={dataDraft.length}
              navigation={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      )}
      {}
      {canSeeDraft && !isMahasiswa && !isUserAdmin && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Riwayat Pengajuan Pengunduran Diri</h5>
          </div>
          <Formsearch
            onSearch={handleSearch}
            onFilter={handleFilterApply}
            onRefresh={handleRefresh}
            onExport={handleExportExcel}
            showAddButton={false}
            showRefreshButton={true}
            showExportButton={true}
            searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
            filterContent={filterContent}
          />
          <Table
            data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
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
          {filteredDataRiwayat.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPageRiwayat}
              totalData={filteredDataRiwayat.length}
              navigation={(p) => setCurrentPageRiwayat(p)}
            />
          )}
        </div>
      )}
      {}
      {isFinance && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Riwayat Pengajuan</h5>
          </div>
          <Formsearch
            onSearch={handleSearch}
            onFilter={handleFilterApply}
            onRefresh={handleRefresh}
            showAddButton={false}
            showRefreshButton={true}
            searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
            filterContent={filterContent}
          />
          <Table
            data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
            onDetail={handleDetail}
            onUnduhBerkas={handleUnduhBerkas}
          />
          {filteredDataRiwayat.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPageRiwayat}
              totalData={filteredDataRiwayat.length}
              navigation={(p) => setCurrentPageRiwayat(p)}
            />
          )}
        </div>
      )}
      {}
      {/* Untuk role Wadir - Menampilkan Daftar Pengajuan dengan status Belum Disetujui Wadir 1 dan Riwayat */}
      {isWadir1 && (
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Daftar Pengajuan</h5>
            </div>
            <Table
              data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
              onDetail={handleDetail}
              onApprove={handleApprove}
              onReject={handleReject}
            />
            {dataDraft.length > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPage}
                totalData={dataDraft.length}
                navigation={(p) => setCurrentPage(p)}
              />
            )}
          </div>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Riwayat Pengajuan</h5>
            </div>
            <Formsearch
              onSearch={handleSearch}
              onFilter={handleFilterApply}
              onRefresh={handleRefresh}
              showAddButton={false}
              showRefreshButton={true}
              searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
              filterContent={filterContent}
            />
            <Table
              data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
              onDetail={handleDetail}
              onUnduhBerkas={handleUnduhBerkas}
            />
            {filteredDataRiwayat.length > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPageRiwayat}
                totalData={filteredDataRiwayat.length}
                navigation={(p) => setCurrentPageRiwayat(p)}
              />
            )}
          </div>
        </>
      )}
      {}
      {/* Untuk role lain (selain Mahasiswa, Prodi, Admin, Finance, Wadir) */}
      {!isMahasiswa && !canSeeDraft && !isUserAdmin && !isFinance && !isWadir1 && (
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Daftar Pengajuan</h5>
            </div>
            <Table
              data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
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
            {dataDraft.length > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPage}
                totalData={dataDraft.length}
                navigation={(p) => setCurrentPage(p)}
              />
            )}
          </div>
          <div className="mb-4">
            <Formsearch
              onSearch={handleSearch}
              onFilter={handleFilterApply}
              onRefresh={handleRefresh}
              showAddButton={false}
              showRefreshButton={true}
              searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
              filterContent={filterContent}
            />
            <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
              <h5 className="mb-0">Daftar Riwayat Pengajuan</h5>
            </div>
            <Table
              data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
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
            {filteredDataRiwayat.length > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPageRiwayat}
                totalData={filteredDataRiwayat.length}
                navigation={(p) => setCurrentPageRiwayat(p)}
              />
            )}
          </div>
        </>
      )}
      {}
      {showRejectModal && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
                  {' Tolak Pengajuan'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={handleRejectCancel}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">Masukkan alasan penolakan:</p>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Alasan penolakan wajib diisi..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    color: '#212529',
                    backgroundColor: '#ffffff',
                    fontSize: '14px'
                  }}
                  autoFocus
                  aria-label="Alasan penolakan"
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleRejectCancel}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleRejectSubmit}
                >
                  <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
                  {' Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainContent>
  );
}
