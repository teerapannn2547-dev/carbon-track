export default function Navbar() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 20
      }}
    >
      <h2>🌱 EcoLife</h2>

      <button
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          background: "#22c55e",
          color: "white"
        }}
      >
        Login
      </button>
    </div>
  );
}