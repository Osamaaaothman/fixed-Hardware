/**
 * Enhanced Lock Middleware with Security Features
 * 
 * Features:
 * - Bcrypt password hashing
 * - Rate limiting on unlock attempts
 * - Automatic lockout after failed attempts
 * - Environment variable configuration
 */

import bcrypt from "bcrypt";
import HardwareConfig from "../config/hardware.config.js";

// System lock state
let isSystemLocked = false;

// Failed attempt tracking
const failedAttempts = new Map(); // IP -> { count, lockoutUntil }

/**
 * Hash for the secret code (generated once at startup)
 * Override with LOCK_SECRET environment variable
 */
let secretHash = null;

// Initialize secret hash
const initializeSecret = async () => {
  const { SECRET_CODE, REQUIRE_HASH } = HardwareConfig.SECURITY.LOCK;
  
  if (REQUIRE_HASH) {
    secretHash = await bcrypt.hash(SECRET_CODE, 10);
    console.log("[LockMiddleware] Secret code hashed and ready");
  } else {
    secretHash = SECRET_CODE; // Plain text for development
    console.log("[LockMiddleware] Using plain text secret (development mode)");
  }
};

// Initialize on module load
initializeSecret().catch((err) => {
  console.error("[LockMiddleware] Failed to initialize secret:", err);
});

/**
 * Get client IP address
 * @param {Object} req - Express request
 * @returns {string} IP address
 */
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || "unknown";
};

/**
 * Check if IP is locked out
 * @param {string} ip - Client IP
 * @returns {boolean}
 */
const isLockedOut = (ip) => {
  const attempt = failedAttempts.get(ip);
  if (!attempt) return false;

  const now = Date.now();
  if (attempt.lockoutUntil && now < attempt.lockoutUntil) {
    return true;
  }

  // Lockout expired, reset
  if (attempt.lockoutUntil && now >= attempt.lockoutUntil) {
    failedAttempts.delete(ip);
    return false;
  }

  return false;
};

/**
 * Record failed attempt
 * @param {string} ip - Client IP
 */
const recordFailedAttempt = (ip) => {
  const { MAX_ATTEMPTS, LOCKOUT_DURATION } = HardwareConfig.SECURITY.LOCK;
  
  let attempt = failedAttempts.get(ip) || { count: 0, lockoutUntil: null };
  attempt.count++;

  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    console.warn(
      `[LockMiddleware] IP ${ip} locked out after ${attempt.count} failed attempts`
    );
  }

  failedAttempts.set(ip, attempt);
};

/**
 * Reset failed attempts for IP
 * @param {string} ip - Client IP
 */
const resetFailedAttempts = (ip) => {
  failedAttempts.delete(ip);
};

/**
 * Lock middleware - blocks requests when system is locked
 */
export const lockMiddleware = (req, res, next) => {
  // Skip if lock system is disabled
  if (!HardwareConfig.SECURITY.LOCK.ENABLED) {
    return next();
  }

  // Allow lock/unlock endpoints to pass through
  if (
    req.path === "/api/system/lock" ||
    req.path === "/api/system/unlock" ||
    req.path === "/api/system/status"
  ) {
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

/**
 * Lock the system
 * @returns {Object} Status
 */
export const lockSystem = () => {
  isSystemLocked = true;
  console.log("[LockMiddleware] System locked");
  return { success: true, locked: true };
};

/**
 * Unlock the system with code verification
 * @param {string} code - Unlock code
 * @param {string} ip - Client IP address
 * @returns {Promise<Object>} Status
 */
export const unlockSystem = async (code, ip = "unknown") => {
  // Check if IP is locked out
  if (isLockedOut(ip)) {
    const attempt = failedAttempts.get(ip);
    const remainingTime = Math.ceil((attempt.lockoutUntil - Date.now()) / 1000);
    
    return {
      success: false,
      locked: true,
      error: `Too many failed attempts. Try again in ${remainingTime} seconds.`,
      lockedOut: true,
    };
  }

  // Verify code
  const { REQUIRE_HASH } = HardwareConfig.SECURITY.LOCK;
  let isValid = false;

  if (REQUIRE_HASH) {
    isValid = await bcrypt.compare(code, secretHash);
  } else {
    isValid = code === secretHash;
  }

  if (isValid) {
    isSystemLocked = false;
    resetFailedAttempts(ip);
    console.log(`[LockMiddleware] System unlocked by ${ip}`);
    return {
      success: true,
      locked: false,
      message: "System unlocked successfully",
    };
  }

  // Invalid code
  recordFailedAttempt(ip);
  const attempt = failedAttempts.get(ip);
  const { MAX_ATTEMPTS } = HardwareConfig.SECURITY.LOCK;
  const remaining = MAX_ATTEMPTS - attempt.count;

  console.warn(`[LockMiddleware] Failed unlock attempt from ${ip} (${attempt.count}/${MAX_ATTEMPTS})`);

  return {
    success: false,
    locked: true,
    error: remaining > 0
      ? `Invalid code. ${remaining} attempts remaining.`
      : "Maximum attempts exceeded.",
    attemptsRemaining: Math.max(0, remaining),
  };
};

/**
 * Get system lock status
 * @returns {Object} Status
 */
export const getSystemStatus = () => {
  return {
    locked: isSystemLocked,
    enabled: HardwareConfig.SECURITY.LOCK.ENABLED,
  };
};

/**
 * Reset secret code (admin function)
 * @param {string} newCode - New secret code
 */
export const resetSecret = async (newCode) => {
  const { REQUIRE_HASH } = HardwareConfig.SECURITY.LOCK;
  
  if (REQUIRE_HASH) {
    secretHash = await bcrypt.hash(newCode, 10);
  } else {
    secretHash = newCode;
  }
  
  console.log("[LockMiddleware] Secret code reset");
  return { success: true };
};
