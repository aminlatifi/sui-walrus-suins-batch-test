export const EpochSlider = ({
  epochs,
  setEpochs,
}: {
  epochs: number;
  setEpochs: (epochs: number) => void;
}) => {
  return (
    <div style={{ marginBottom: "15px" }}>
      <label
        style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
      >
        Storage Duration: {epochs} epoch{epochs !== 1 ? "s" : ""} (~
        {epochs * 14} days)
      </label>
      <input
        type="range"
        min="1"
        max="10"
        value={epochs}
        onChange={(e) => setEpochs(Number(e.target.value))}
        style={{ width: "100%", marginBottom: "5px" }}
      />
      <div style={{ fontSize: "12px", color: "#666" }}>
        Longer storage = higher WAL cost
      </div>
    </div>
  );
};
