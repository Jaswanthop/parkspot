export function Spinner({ size = 18, label = 'Loading' }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
}

export function PageLoader({ label = 'Loading ParkSpot…' }) {
  return (
    <div className="page-loader">
      <Spinner size={30} label={label} />
      <p>{label}</p>
    </div>
  );
}
