import toast from "react-hot-toast";

export interface UploadItem {
  id: number;
  key: string;
  type: "text" | "image";
  value: string;
  bytes: Uint8Array;
}

export const UploadItemsForm = ({
  items,
  setItems,
}: {
  items: UploadItem[];
  setItems: (items: UploadItem[]) => void;
}) => {
  return (
    <div style={{ marginBottom: "10px" }}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {/* Key input */}
          <input
            type="text"
            value={item.key}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].key = e.target.value;
              setItems(newItems);
            }}
            placeholder="Key"
            style={{
              flex: 1,
              padding: "6px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />

          {/* Type dropdown */}
          <select
            value={item.type}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].type = e.target.value as "text" | "image";
              // Reset value and bytes when type changes
              newItems[idx].value = "";
              newItems[idx].bytes = new Uint8Array();
              setItems(newItems);
            }}
            style={{
              flex: 0.7,
              padding: "6px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
          </select>

          {/* Value input */}
          {item.type === "text" ? (
            <input
              type="text"
              value={item.value}
              onChange={(e) => {
                const newItems = [...items];
                newItems[idx].value = e.target.value;
                newItems[idx].bytes = new TextEncoder().encode(e.target.value);
                setItems(newItems);
              }}
              placeholder="Enter value"
              style={{
                flex: 2,
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const arrayBuffer = await file.arrayBuffer();
                  const uint8 = new Uint8Array(arrayBuffer);
                  const newItems = [...items];
                  newItems[idx].value = file.name;
                  newItems[idx].bytes = uint8;
                  setItems(newItems);
                }
              }}
              style={{
                flex: 2,
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          )}

          {/* Remove item button */}
          <button
            type="button"
            onClick={() => {
              setItems(items.filter((_, i) => i !== idx));
              toast.success("Item removed");
            }}
            style={{
              marginLeft: "5px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
            title="Remove item"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setItems([
            ...items,
            {
              id: Date.now() + Math.random(),
              key: "",
              type: "text",
              value: "",
              bytes: new Uint8Array(),
            },
          ]);
          toast.success("New item added");
        }}
        style={{
          marginBottom: "10px",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "6px 16px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        + Add Item
      </button>
    </div>
  );
};
