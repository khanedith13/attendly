import Logo from "../components/Logo";
import "./AuthLayout.css";

export default function AuthLayout({ art, wide = false, showLogo = false, children }) {
  return (
    <div className="auth">
      <section className="auth__art">
        <Logo onDark large />
        {art}
      </section>

      <section className="auth__panel">
        <div className={wide ? "auth__box auth__box--wide" : "auth__box"}>
          {showLogo && (
            <div className="auth__box-logo">
              <Logo large />
            </div>
          )}
          {children}
        </div>
      </section>
    </div>
  );
}