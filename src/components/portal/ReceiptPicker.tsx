import { useEffect, useMemo, useState } from "react";
import { I } from "./ui";

const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX = 5 * 1024 * 1024;

export default function ReceiptPicker({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => file?.type.startsWith("image/") ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (selected?: File) => {
    if (!selected) return;
    if (!TYPES.includes(selected.type)) return setError("Please use a JPG, PNG, WEBP or PDF file.");
    if (selected.size > MAX) return setError("File must be smaller than 5 MB.");
    setError("");
    onChange(selected);
  };

  return (
    <div>
      <label
        className={`receipt-drop ${drag ? "drag" : ""} ${file ? "has" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => { event.preventDefault(); setDrag(false); pick(event.dataTransfer.files[0]); }}
      >
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden
          onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} />
        {file ? <>
          {preview ? <img src={preview} alt="Receipt preview" /> : <span className="receipt-pdf">PDF</span>}
          <div><b>{file.name}</b><small>{Math.round(file.size / 1024)} KB · click to change</small></div>
          <span className="receipt-ok">{I.check} Added</span>
        </> : <>
          <span className="receipt-icon">{I.upload}</span>
          <div><b>Upload payment receipt</b><small>Drag & drop or click · JPG, PNG, WEBP, PDF · max 5 MB</small></div>
        </>}
      </label>
      {error && <p className="receipt-err">{error}</p>}
    </div>
  );
}
