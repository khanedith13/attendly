import "./ScannerPreview.css";

export default function ScannerPreview({ hint, caption }) {
  return (
    <div className="scanner">
      <p className="scanner__hint">{hint}</p>
      <div className="scanner__frame">
        <span className="scanner__corner scanner__corner--tl" />
        <span className="scanner__corner scanner__corner--tr" />
        <span className="scanner__corner scanner__corner--bl" />
        <span className="scanner__corner scanner__corner--br" />
        <span className="scanner__line" />
      </div>
      <p className="scanner__caption">{caption}</p>
    </div>
  );
}