import PropTypes from "prop-types";

export default function Badge({
  status = "Aktif",
  size = "sm",
  customMap = {},
  className = "",
}) {
  const defaultStyleMap = {
    Draft: "bg-secondary-subtle text-secondary",
    Diproses: "bg-warning-subtle text-warning",
    "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
    "Belum Disetujui Direktur": "bg-warning-subtle text-warning",
    "Belum Disetujui Finance": "bg-warning-subtle text-warning",
    "Menunggu Persetujuan Wadir 1": "bg-warning-subtle text-warning",
    "Menunggu Persetujuan Direktur": "bg-warning-subtle text-warning",
    "Menunggu Persetujuan Finance": "bg-warning-subtle text-warning",
    "Menunggu Upload SK": "bg-warning-subtle text-warning",
    Disetujui: "bg-success-subtle text-success",
    Ditolak: "bg-danger-subtle text-danger",
    Aktif: "bg-success-subtle text-success",
    "Tidak Aktif": "bg-secondary-subtle text-secondary",
    Selesai: "bg-primary-subtle text-primary",
    Batal: "bg-danger-subtle text-danger",
  };

  const styleMap = { ...defaultStyleMap, ...customMap };
  const badgeClass = styleMap[status] || "bg-secondary-subtle text-secondary";

  const sizeClasses = {
    xs: "px-1 py-0",
    sm: "px-2 py-1",
    md: "px-2 py-1",
    lg: "px-3 py-2",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`badge ${badgeClass} ${sizeClass} ${className}`}
      style={{ borderRadius: "0.6rem", fontWeight: 500 }}
    >
      {status}
    </span>
  );
}

Badge.propTypes = {
  status: PropTypes.string,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg"]),
  customMap: PropTypes.objectOf(PropTypes.string),
  className: PropTypes.string,
};
