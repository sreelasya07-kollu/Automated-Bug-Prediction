/**
 * BugPredict – App settings
 * Change API_BASE_URL to your backend (e.g. Flask server).
 * Leave empty to use client-side analysis only.
 */
(function(global) {
  'use strict';
  global.BugPredictConfig = {
    // Backend API URL (no trailing slash). Example: "http://localhost:5000"
    API_BASE_URL: 'http://localhost:5000',
    // Request timeout in ms
    API_TIMEOUT_MS: 15000
  };
})(typeof window !== 'undefined' ? window : this);
