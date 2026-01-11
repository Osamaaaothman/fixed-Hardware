const LogoBox = () => {
  return (
    <div className="w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border-2 border-primary flex items-center justify-center">
          <span className="text-2xl font-black text-primary">N</span>
        </div>
        <span className="text-sm font-bold tracking-wider text-base-content">
          NEXABOARD
        </span>
      </div>
    </div>
  );
};

export default LogoBox;
