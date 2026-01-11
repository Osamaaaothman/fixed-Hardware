import FreeDrawButton from "./FreeDrawButton";
import EraseButton from "./EraseButton";
import ClearBoardButton from "./ClearBoardButton";

const Toolbar = ({
  isDrawingMode,
  isEraserMode,
  onFreeDrawClick,
  onEraseClick,
  onClearBoard,
}) => {
  return (
    <div className="bg-base-100 rounded-xl p-6 border-2 border-base-300">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-base-300">
        <svg
          className="w-5 h-5 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <h3 className="text-lg font-semibold">Tools</h3>
      </div>

      <div className="flex flex-wrap gap-3">
        <FreeDrawButton isActive={isDrawingMode} onClick={onFreeDrawClick} />
        <EraseButton isActive={isEraserMode} onClick={onEraseClick} />
        <ClearBoardButton onClick={onClearBoard} />
      </div>
    </div>
  );
};

export default Toolbar;
