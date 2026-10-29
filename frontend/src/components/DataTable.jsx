import "./DataTable.css";

// columns: [{ key: "name", header: "Event", bold: true, render: (row) => ... }]
export default function DataTable({ columns, rows, rowKey = "id", empty = "Nothing to show yet." }) {  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((col) => (
                <td key={col.key} className={col.bold ? "table__bold" : undefined}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
