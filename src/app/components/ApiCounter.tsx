"use client";

import { useCallback, useEffect, useState } from "react";

interface CounterData {
  total: number;
  breakdown: Record<string, number>;
  message: string;
}

export function ApiCounter() {
  const [counterData, setCounterData] = useState<CounterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState("/api/test");

  const fetchCounter = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/counter");
      const data = await response.json();
      setCounterData(data);
    } catch (error) {
      console.error("Failed to fetch counter:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const incrementCounter = async (endpoint: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      await response.json();
      // Refresh counter data
      await fetchCounter();
    } catch (error) {
      console.error("Failed to increment counter:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetCounter = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/counter", { method: "DELETE" });
      await response.json();
      // Refresh counter data
      await fetchCounter();
    } catch (error) {
      console.error("Failed to reset counter:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounter();
  }, [fetchCounter]);

  return (
    <div className="api-counter-container">
      <div className="api-counter-card">
        <div className="api-counter-header">
          <h2 className="api-counter-title">API Counter</h2>
          <span className="api-counter-badge">
            {loading ? "..." : (counterData?.total ?? 0)}
          </span>
        </div>

        {counterData && Object.keys(counterData.breakdown).length > 0 && (
          <div className="api-counter-breakdown">
            <h3 className="api-counter-subtitle">Breakdown by Endpoint</h3>
            <ul className="api-counter-list">
              {Object.entries(counterData.breakdown).map(
                ([endpoint, count]) => (
                  <li key={endpoint} className="api-counter-list-item">
                    <code className="api-counter-endpoint">{endpoint}</code>
                    <span className="api-counter-count">{count}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        <div className="api-counter-actions">
          <div className="api-counter-input-group">
            <input
              type="text"
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value)}
              placeholder="Endpoint path"
              className="api-counter-input"
            />
            <button
              type="button"
              onClick={() => incrementCounter(testEndpoint)}
              disabled={loading}
              className="api-counter-button api-counter-button-primary"
            >
              Increment
            </button>
          </div>
          <div className="api-counter-button-group">
            <button
              type="button"
              onClick={fetchCounter}
              disabled={loading}
              className="api-counter-button api-counter-button-secondary"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={resetCounter}
              disabled={loading}
              className="api-counter-button api-counter-button-danger"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
