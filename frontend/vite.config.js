import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  if (mode === "production" && !env.VITE_API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Set it to your API address, " +
        "for example https://api.example.com/api, before building.",
    );
  }

  return {
    plugins: [react()],
  };
});
