const ClearBoardButton = ({ onClick }) => {
  return (
    <button className="btn btn-outline btn-warning gap-2" onClick={onClick}>
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      Clear Board
    </button>
  );
};

export default ClearBoardButton;
