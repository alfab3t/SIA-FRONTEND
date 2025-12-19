import { useState, useEffect } from "react";
import { Avatar } from "@/components/common/Img";
import Badge from "@/components/common/Badge";
import Loading from "@/components/common/Loading";
import Toast from "@/components/common/Toast";
import { API_LINK } from "@/lib/constant";

const ProfilMahasiswaModal = ({ isOpen, onClose, mhsId }) => {
  const [profilData, setProfilData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && mhsId) {
      loadProfilMahasiswa(mhsId);
    }
  }, [isOpen, mhsId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset'; // Restore scroll
    };
  }, [isOpen]);

  const loadProfilMahasiswa = async (mahasiswaId) => {
    setIsLoading(true);
    try {
      console.log("Loading profil for mahasiswa:", mahasiswaId);
      const endpoint = `${API_LINK}DropOut/mahasiswa-profil?mhsId=${mahasiswaId}`;
      console.log("Profil endpoint:", endpoint);
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Profil response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Profil error response:", errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Raw profil data:", data);
      
      setProfilData(data);
    } catch (err) {
      console.error("Error loading profil:", err);
      Toast.error("Gagal memuat profil mahasiswa: " + err.message);
      setProfilData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setProfilData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title d-flex align-items-center">
              <i className="bi bi-person-circle me-2"></i>
              Profil Mahasiswa
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleClose}
            ></button>
          </div>
          
          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Memuat profil mahasiswa...</p>
              </div>
            ) : profilData ? (
              <div className="row g-4">
                {/* Profile Header */}
                <div className="col-12">
                  <div className="card border-0 bg-light">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-3 text-center">
                          <Avatar 
                            name={profilData.nama || "Mahasiswa"} 
                            size={100} 
                          />
                          <div className="mt-3">
                            <Badge status="Aktif" />
                          </div>
                        </div>
                        <div className="col-md-9">
                          <h4 className="fw-bold text-primary mb-1">
                            {profilData.nama || "Nama tidak tersedia"}
                          </h4>
                          <h6 className="text-muted mb-3">
                            NIM: {mhsId}
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-mortarboard text-primary me-2"></i>
                                <span className="fw-medium">Program Studi:</span>
                                <span className="ms-2 small">{profilData.prodiKonsentrasi || "Manajemen Informatika"}</span>
                              </div>
                              <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-people text-primary me-2"></i>
                                <span className="fw-medium">Kelas:</span>
                                <span className="ms-2">{profilData.kelas || "Tidak tersedia"}</span>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-calendar-check text-primary me-2"></i>
                                <span className="fw-medium">Angkatan:</span>
                                <span className="ms-2">{profilData.angkatan || "2024"}</span>
                              </div>
                              <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-envelope text-primary me-2"></i>
                                <span className="fw-medium">Email:</span>
                                <span className="ms-2 small">{`${mhsId}@student.astratech.ac.id`}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Information Cards */}
                <div className="col-12">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="card h-100 border-primary">
                        <div className="card-body text-center">
                          <i className="bi bi-mortarboard fs-1 text-primary mb-3"></i>
                          <h6 className="card-title">Program Studi</h6>
                          <p className="card-text text-muted small">
                            {profilData.prodiKonsentrasi || "Manajemen Informatika (MI)"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card h-100 border-success">
                        <div className="card-body text-center">
                          <i className="bi bi-calendar-check fs-1 text-success mb-3"></i>
                          <h6 className="card-title">Angkatan</h6>
                          <p className="card-text">
                            <span className="badge bg-success fs-6 px-3 py-2 rounded-pill">
                              {profilData.angkatan || "2024"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card h-100 border-info">
                        <div className="card-body text-center">
                          <i className="bi bi-people fs-1 text-info mb-3"></i>
                          <h6 className="card-title">Kelas</h6>
                          <p className="card-text">
                            <span className="badge bg-info fs-6 px-3 py-2 rounded-pill">
                              {profilData.kelas || "Tidak tersedia"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        Informasi Detail
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="border-bottom pb-2 mb-3">
                            <small className="text-muted">Nama Lengkap</small>
                            <div className="fw-medium">{profilData.nama || "Tidak tersedia"}</div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="border-bottom pb-2 mb-3">
                            <small className="text-muted">Nomor Induk Mahasiswa</small>
                            <div className="fw-medium">
                              <code className="bg-light px-2 py-1 rounded">{mhsId}</code>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="border-bottom pb-2 mb-3">
                            <small className="text-muted">Program Studi & Konsentrasi</small>
                            <div className="fw-medium">{profilData.prodiKonsentrasi || "Manajemen Informatika (MI)"}</div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="border-bottom pb-2 mb-3">
                            <small className="text-muted">Kelas</small>
                            <div className="fw-medium">{profilData.kelas || "Tidak tersedia"}</div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="border-bottom pb-2 mb-3">
                            <small className="text-muted">Tahun Angkatan</small>
                            <div className="fw-medium">{profilData.angkatan || "2024"}</div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="border-bottom pb-2 mb-3">
                            <small className="text-muted">Status Mahasiswa</small>
                            <div className="fw-medium">
                              <Badge status="Aktif" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-person-x fs-1 text-muted"></i>
                <h5 className="mt-3 text-muted">Data profil mahasiswa tidak ditemukan</h5>
                <p className="text-muted">Silakan coba lagi atau hubungi administrator</p>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              <i className="bi bi-x-circle me-2"></i>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilMahasiswaModal;