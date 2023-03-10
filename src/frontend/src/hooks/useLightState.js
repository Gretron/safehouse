import { useState } from "react";

/**
 * Hook to Turn Light On or Off
 */
export const useLightState = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const getLightState = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("api/light/state");

    const json = await response.json();

    if (!response.ok) {
      setError("Not Found");
    } else {
      setLoading(false);
      return json;
    }

    setLoading(false);
  };

  const setLightState = async (state) => {
    setLoading(true);
    setError(null);

    const route = state ? "on" : "off";

    const response = await fetch("api/light/" + route);

    const json = await response.json();

    if (!response.ok) {
      setError("Not Found");
    } else {
      setLoading(false);
      return json;
    }

    setLoading(false);
  };

  return { getLightState, setLightState, loading, error };
};
