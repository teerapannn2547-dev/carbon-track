export default function BottomNav() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        padding: 15,
        display: "flex",
        justifyContent: "space-around",
        borderTop: "1px solid #ddd"
      }}
    >
      <span>🏠 Home</span>
      <span>📊 Stats</span>
      <span>👤 Profile</span>
    </div>
  );
}