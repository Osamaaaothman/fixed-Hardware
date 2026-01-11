import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

/**
 * Upload an image and get G-code with custom options
 * @param {File} imageFile - The image file to convert
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - The generated G-code, stats, and processed image
 */
export async function convertImageToGcode(imageFile, options = {}) {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);

    // Add options to formData
    if (options.imageSize) formData.append("imageSize", options.imageSize);
    if (options.detailLevel)
      formData.append("detailLevel", options.detailLevel);
    if (options.feedRate) formData.append("feedRate", options.feedRate);
    if (options.penUp !== undefined) formData.append("penUp", options.penUp);
    if (options.penDown !== undefined)
      formData.append("penDown", options.penDown);
    if (options.tolerance !== undefined)
      formData.append("tolerance", options.tolerance);
    if (options.removeNoise !== undefined)
      formData.append("removeNoise", options.removeNoise);
    if (options.minPathLength !== undefined)
      formData.append("minPathLength", options.minPathLength);

    const response = await axios.post(`${API_BASE_URL}/convert`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000, // 120 second timeout for large images
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.error || "Failed to convert image");
    } else if (error.request) {
      // Request made but no response
      throw new Error(
        "No response from server. Make sure the backend is running."
      );
    } else {
      // Error setting up request
      throw new Error(error.message);
    }
  }
}

/**
 * Check API health status
 * @returns {Promise<object>} - Health check response
 */
export async function checkHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    throw new Error("API is not responding");
  }
}
