import { API_CONFIG } from '../config/api.config.js';

const API_BASE_URL = API_CONFIG.ENDPOINTS.TEXT;

/**
 * Fetch all available fonts with metadata
 * @returns {Promise<Array>} Array of font objects with name and description
 */
export async function fetchFonts() {
  try {
    const response = await fetch(`${API_BASE_URL}/fonts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch fonts: ${response.statusText}`);
    }
    const data = await response.json();
    return data.fonts;
  } catch (error) {
    console.error("Error fetching fonts:", error);
    throw error;
  }
}

/**
 * Fetch complete font data including all character paths
 * @param {string} fontName - Name of the font to fetch
 * @returns {Promise<Object>} Full font data with character paths
 */
export async function fetchFont(fontName) {
  try {
    const response = await fetch(`${API_BASE_URL}/fonts/${fontName}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch font '${fontName}': ${response.statusText}`
      );
    }
    const data = await response.json();
    return data.font;
  } catch (error) {
    console.error(`Error fetching font '${fontName}':`, error);
    throw error;
  }
}

/**
 * Convert text to G-code using specified font and settings
 * @param {Object} params - Conversion parameters
 * @param {string} params.text - Text to convert
 * @param {string} [params.font='simplex'] - Font name
 * @param {number} [params.size=10] - Font size in mm
 * @param {number} [params.spacing=2] - Character spacing in mm
 * @param {number} [params.lineSpacing=1.5] - Line spacing multiplier
 * @param {number} [params.feedRate=1500] - Feed rate in mm/min
 * @param {number} [params.penUp=5] - Z height for pen up
 * @param {number} [params.penDown=-2] - Z height for pen down
 * @param {string} [params.alignment='left'] - Text alignment: 'left', 'center', or 'right'
 * @returns {Promise<Object>} Response with gcode, stats, settings, and font info
 */
export async function convertTextToGcode(params) {
  try {
    const response = await fetch(`${API_BASE_URL}/text/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Conversion failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error converting text to G-code:", error);
    throw error;
  }
}

/**
 * Preview text dimensions without generating G-code
 * @param {Object} params - Preview parameters
 * @param {string} params.text - Text to preview
 * @param {string} [params.font='simplex'] - Font name
 * @param {number} [params.size=10] - Font size in mm
 * @param {number} [params.spacing=2] - Character spacing in mm
 * @param {number} [params.lineSpacing=1.5] - Line spacing multiplier
 * @returns {Promise<Object>} Response with bounds {width, height} and settings
 */
export async function previewTextBounds(params) {
  try {
    const response = await fetch(`${API_BASE_URL}/text/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Preview failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error previewing text bounds:", error);
    throw error;
  }
}
