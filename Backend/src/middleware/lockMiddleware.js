// Lock middleware to block all endpoints when system is locked
let isSystemLocked = false;
const SECRET_CODE = "1234";

export const lockMiddleware = (req, res, next) => {
  // Allow lock/unlock endpoints to pass through
  if (req.path === "/api/system/lock" || req.path === "/api/system/unlock" || req.path === "/api/system/status") {
    return next();
  }

  // Block all other endpoints if system is locked
  if (isSystemLocked) {
    return res.status(423).json({
      success: false,
      error: "System is locked. Please unlock to continue.",
      locked: true,
    });
  }

  next();
};

export const lockSystem = () => {
  isSystemLocked = true;
  return { success: true, locked: true };
};

export const unlockSystem = (code) => {
  if (code === SECRET_CODE) {
    isSystemLocked = false;
    return { success: true, locked: false, message: "System unlocked successfully" };
  }
  return { success: false, locked: true, error: "Invalid code" };
};

export const getSystemStatus = () => {
  return { locked: isSystemLocked };
};
