import "./LoadingBlock.css";

export default function LoadingBlock({ text = "Loading..." }) {
  return <div className="loading-block">{text}</div>;
}