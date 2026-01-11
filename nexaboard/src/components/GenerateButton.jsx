import { toast } from "sonner";

const GenerateButton = ({ onClick, disabled = false }) => {
  const handleGenerate = () => {
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={disabled}
      className="btn btn-success btn-lg gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {disabled ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          Generating...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Generate
        </>
      )}
    </button>
  );
};

export default GenerateButton;
