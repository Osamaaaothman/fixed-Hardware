import { useState, useEffect } from "react";
import { fetchFonts } from "../api/textApi";

const FontSelectorRow = ({ selectedFont, setSelectedFont }) => {
  const [fonts, setFonts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        setLoading(true);
        const fontList = await fetchFonts();
        // Filter to show only simplex font
        const simplexOnly = fontList.filter((f) => f.id === "simplex");
        setFonts(simplexOnly.length > 0 ? simplexOnly : fontList);
        setError(null);
      } catch (err) {
        console.error("Failed to load fonts:", err);
        setError("Failed to load fonts");
        // Fallback to default fonts
        setFonts([
          {
            id: "simplex",
            name: "Hershey Simplex",
            description: "Simple single-line font",
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadFonts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-28">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="alert alert-warning py-2 px-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-xs">Using fallback fonts</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {fonts.map((font, index) => (
          <div
            key={font.id || font.name}
            onClick={() => setSelectedFont(index)}
            className={`w-28 h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
              selectedFont === index
                ? "bg-primary border-2 border-primary ring-4 ring-primary/20 scale-105"
                : "bg-base-300 border-2 border-base-400 hover:bg-base-400 hover:border-primary/50 hover:scale-102"
            }`}
          >
            <span
              className={`text-base font-semibold capitalize ${
                selectedFont === index
                  ? "text-primary-content"
                  : "text-base-content"
              }`}
            >
              {font.name}
            </span>
            <span
              className={`text-xs mt-1 text-center px-2 ${
                selectedFont === index
                  ? "text-primary-content/70"
                  : "text-base-content/60"
              }`}
            >
              {font.description?.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FontSelectorRow;
