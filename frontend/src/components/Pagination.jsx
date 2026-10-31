import "./Pagination.css";

export default function Pagination({ page, pageSize, total, onChange, noun = "items" }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Up to five page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => start + index);

  return (
    <div className="pager">
      <span>
        Showing {from}–{to} of {total.toLocaleString()} {noun}
      </span>
      <div className="pager__buttons">
        <button
          type="button"
          className="pager__btn"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </button>
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            className={number === page ? "pager__btn pager__btn--active" : "pager__btn"}
            aria-current={number === page ? "page" : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="pager__btn"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}