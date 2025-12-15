import PropTypes from "prop-types";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";

export default function Table({
  data,
  size = "Normal",
  onToggle = () => {},
  onCancel = () => {},
  onDelete = () => {},
  onDetail = () => {},
  onEdit = () => {},
  onApprove = () => {},
  onReject = () => {},
  onSent = () => {},
  onUpload = () => {},
  onFinal = () => {},
  onPrint = () => {},

  // ⬅⬅⬅ Tambahkan ini
  onAjukan = () => {},
}) {
  if (!data || data.length === 0) return <p>Tidak ada data.</p>;

  const columns = Object.keys(data[0]).filter(
    (v) => v !== "Key" && v !== "Count" && v !== "Alignment" && v !== "id"
  );

  return (
    <div className="table-responsive shadow-sm  rounded-4">
      <table
        style={{ whiteSpace: "nowrap" }}
        className={`table table-hover table-borderless  m-0 ${
          size === "Small" ? "table-sm small" : ""
        }`}
      >
        <TableHeader columns={columns} />
        <tbody>
          {data.map((row) => (
            <TableRow
              key={row.Key || row.id}
              row={row}
              columns={columns}
              onToggle={onToggle}
              onCancel={onCancel}
              onDelete={onDelete}
              onDetail={onDetail}
              onEdit={onEdit}
              onApprove={onApprove}
              onReject={onReject}
              onSent={onSent}
              onUpload={onUpload}
              onFinal={onFinal}
              onPrint={onPrint}

              // ⬅⬅⬅ Tambahkan ini ke TableRow
              onAjukan={onAjukan}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

Table.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  size: PropTypes.oneOf(["Normal", "Small"]),
  onToggle: PropTypes.func,
  onCancel: PropTypes.func,
  onDelete: PropTypes.func,
  onDetail: PropTypes.func,
  onEdit: PropTypes.func,
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
  onSent: PropTypes.func,
  onUpload: PropTypes.func,
  onFinal: PropTypes.func,
  onPrint: PropTypes.func,

  // ⬅⬅⬅ Tambahkan ini
  onAjukan: PropTypes.func,
};