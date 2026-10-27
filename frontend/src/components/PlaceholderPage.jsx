export default function PlaceholderPage({ title, figma }) {
    return (
      <main style={{ padding: 40 }}>
        <p>Figma screen {figma}</p>
        <h1>{title}</h1>
      </main>
    );
  }