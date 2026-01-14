import { API_CONFIG } from "../config/api.config.js";

const API_BASE_URL = API_CONFIG.BASE_URL;

export async function executePen(penType) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pen/execute/${penType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to execute pen");
    }
    return data;
  } catch (error) {
    console.error(`Error executing ${penType}:`, error);
    throw error;
  }
}

export async function addPenToQueue(penType) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pen/queue/${penType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to add pen to queue");
    }
    return data;
  } catch (error) {
    console.error(`Error adding ${penType} to queue:`, error);
    throw error;
  }
}

export async function getPenConfigs() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pen/configs`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to get pen configs");
    }
    return data.pens;
  } catch (error) {
    console.error("Error getting pen configs:", error);
    throw error;
  }
}
