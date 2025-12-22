// vite.config.ts
import { defineConfig } from "file:///home/labpartnersdroplet/lab-main/lablatest/node_modules/vite/dist/node/index.js";
import react from "file:///home/labpartnersdroplet/lab-main/lablatest/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/home/labpartnersdroplet/lab-main/lablatest";
var vite_config_default = defineConfig({
  // Configure plugins - in this case, we're using the React plugin for Vite
  plugins: [react()],
  // Configuration for dependency optimization
  optimizeDeps: {
    // Exclude specific packages from dependency pre-bundling
    exclude: ["lucide-react"],
    // Explicitly include packages in dependency pre-bundling
    include: ["xlsx"]
  },
  // Build-specific configurations
  build: {
    // Configure how CommonJS dependencies are processed
    commonjsOptions: {
      // Include xlsx package in CommonJS processing
      include: [/xlsx/]
    }
  },
  // Development server configurations
  server: {
    host: "0.0.0.0",
    hmr: {
      overlay: false
    },
    allowedHosts: ["app.labpartners.co.zw"],
    // Proxy configuration for handling API requests during development
    proxy: {
      // First proxy rule for '/livehealth' requests
      "/livehealth": {
        // Redirect requests to this target URL
        target: "https://livehealth.solutions",
        // Enable CORS by changing request origin to match target URL
        changeOrigin: true,
        // Remove '/livehealth' prefix when forwarding the request
        rewrite: (path2) => path2.replace(/^\/livehealth/, ""),
        // Disable SSL certificate validation (useful in development)
        secure: false,
        // Advanced proxy configuration with event listeners
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
            console.log("Request Headers:", proxyReq.getHeaders());
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from the Target:", {
              statusCode: proxyRes.statusCode,
              url: req.url,
              headers: proxyRes.headers
            });
          });
        }
      },
      // Second proxy rule for '/api' requests
      "/api": {
        target: "https://livehealth.solutions",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/api/, ""),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Origin", "https://livehealth.solutions");
          });
          proxy.on("error", (err) => {
            console.error("Proxy error:", err);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("Proxy response:", {
              status: proxyRes.statusCode,
              url: req.url,
              headers: proxyRes.headers
            });
          });
        }
      },
      "/storage": {
        target: "https://firebasestorage.googleapis.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path2) => path2.replace(/^\/storage/, "")
      },
      "/androidLISService": {
        target: "https://livehealth.solutions",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Outgoing request:", {
              method: req.method,
              url: req.url,
              headers: proxyReq.getHeaders()
            });
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Incoming response:", {
              statusCode: proxyRes.statusCode,
              url: req.url,
              headers: proxyRes.headers
            });
          });
        }
      },
      "/getAllTestsAndProfiles": {
        target: "https://livehealth.solutions",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Origin", "https://livehealth.solutions");
            proxyReq.setHeader("Access-Control-Allow-Origin", "*");
            proxyReq.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            proxyReq.setHeader("Access-Control-Allow-Headers", "Content-Type");
          });
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9sYWJwYXJ0bmVyc2Ryb3BsZXQvbGFiLW1haW4vbGFibGF0ZXN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9sYWJwYXJ0bmVyc2Ryb3BsZXQvbGFiLW1haW4vbGFibGF0ZXN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2xhYnBhcnRuZXJzZHJvcGxldC9sYWItbWFpbi9sYWJsYXRlc3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuLy8gVGhpcyBpcyB0aGUgbWFpbiBjb25maWd1cmF0aW9uIGZpbGUgZm9yIFZpdGUsIGEgbW9kZXJuIGZyb250ZW5kIGJ1aWxkIHRvb2xcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIC8vIENvbmZpZ3VyZSBwbHVnaW5zIC0gaW4gdGhpcyBjYXNlLCB3ZSdyZSB1c2luZyB0aGUgUmVhY3QgcGx1Z2luIGZvciBWaXRlXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcblxuICAvLyBDb25maWd1cmF0aW9uIGZvciBkZXBlbmRlbmN5IG9wdGltaXphdGlvblxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICAvLyBFeGNsdWRlIHNwZWNpZmljIHBhY2thZ2VzIGZyb20gZGVwZW5kZW5jeSBwcmUtYnVuZGxpbmdcbiAgICBleGNsdWRlOiBbXCJsdWNpZGUtcmVhY3RcIl0sXG4gICAgLy8gRXhwbGljaXRseSBpbmNsdWRlIHBhY2thZ2VzIGluIGRlcGVuZGVuY3kgcHJlLWJ1bmRsaW5nXG4gICAgaW5jbHVkZTogW1wieGxzeFwiXSxcbiAgfSxcblxuICAvLyBCdWlsZC1zcGVjaWZpYyBjb25maWd1cmF0aW9uc1xuICBidWlsZDoge1xuICAgIC8vIENvbmZpZ3VyZSBob3cgQ29tbW9uSlMgZGVwZW5kZW5jaWVzIGFyZSBwcm9jZXNzZWRcbiAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgIC8vIEluY2x1ZGUgeGxzeCBwYWNrYWdlIGluIENvbW1vbkpTIHByb2Nlc3NpbmdcbiAgICAgIGluY2x1ZGU6IFsveGxzeC9dLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gRGV2ZWxvcG1lbnQgc2VydmVyIGNvbmZpZ3VyYXRpb25zXG4gIHNlcnZlcjoge1xuIGhvc3Q6ICcwLjAuMC4wJywgXG4gaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZVxuICAgIH0sXG5hbGxvd2VkSG9zdHM6IFsnYXBwLmxhYnBhcnRuZXJzLmNvLnp3J10sICAgIFxuICAgIC8vIFByb3h5IGNvbmZpZ3VyYXRpb24gZm9yIGhhbmRsaW5nIEFQSSByZXF1ZXN0cyBkdXJpbmcgZGV2ZWxvcG1lbnRcbiAgICBwcm94eToge1xuICAgICAgLy8gRmlyc3QgcHJveHkgcnVsZSBmb3IgJy9saXZlaGVhbHRoJyByZXF1ZXN0c1xuICAgICAgXCIvbGl2ZWhlYWx0aFwiOiB7XG4gICAgICAgIC8vIFJlZGlyZWN0IHJlcXVlc3RzIHRvIHRoaXMgdGFyZ2V0IFVSTFxuICAgICAgICB0YXJnZXQ6IFwiaHR0cHM6Ly9saXZlaGVhbHRoLnNvbHV0aW9uc1wiLFxuICAgICAgICAvLyBFbmFibGUgQ09SUyBieSBjaGFuZ2luZyByZXF1ZXN0IG9yaWdpbiB0byBtYXRjaCB0YXJnZXQgVVJMXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgLy8gUmVtb3ZlICcvbGl2ZWhlYWx0aCcgcHJlZml4IHdoZW4gZm9yd2FyZGluZyB0aGUgcmVxdWVzdFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvbGl2ZWhlYWx0aC8sIFwiXCIpLFxuICAgICAgICAvLyBEaXNhYmxlIFNTTCBjZXJ0aWZpY2F0ZSB2YWxpZGF0aW9uICh1c2VmdWwgaW4gZGV2ZWxvcG1lbnQpXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIC8vIEFkdmFuY2VkIHByb3h5IGNvbmZpZ3VyYXRpb24gd2l0aCBldmVudCBsaXN0ZW5lcnNcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgLy8gSGFuZGxlIHByb3h5IGVycm9yc1xuICAgICAgICAgIHByb3h5Lm9uKFwiZXJyb3JcIiwgKGVyciwgX3JlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcm94eSBlcnJvclwiLCBlcnIpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gTG9nIG91dGdvaW5nIHJlcXVlc3RzXG4gICAgICAgICAgcHJveHkub24oXCJwcm94eVJlcVwiLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTZW5kaW5nIFJlcXVlc3QgdG8gdGhlIFRhcmdldDpcIiwgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlcXVlc3QgSGVhZGVyczpcIiwgcHJveHlSZXEuZ2V0SGVhZGVycygpKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIExvZyBpbmNvbWluZyByZXNwb25zZXNcbiAgICAgICAgICBwcm94eS5vbihcInByb3h5UmVzXCIsIChwcm94eVJlcywgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIFJlc3BvbnNlIGZyb20gdGhlIFRhcmdldDpcIiwge1xuICAgICAgICAgICAgICBzdGF0dXNDb2RlOiBwcm94eVJlcy5zdGF0dXNDb2RlLFxuICAgICAgICAgICAgICB1cmw6IHJlcS51cmwsXG4gICAgICAgICAgICAgIGhlYWRlcnM6IHByb3h5UmVzLmhlYWRlcnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIC8vIFNlY29uZCBwcm94eSBydWxlIGZvciAnL2FwaScgcmVxdWVzdHNcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIHRhcmdldDogXCJodHRwczovL2xpdmVoZWFsdGguc29sdXRpb25zXCIsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub24oXCJwcm94eVJlcVwiLCAocHJveHlSZXEpID0+IHtcbiAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignT3JpZ2luJywgJ2h0dHBzOi8vbGl2ZWhlYWx0aC5zb2x1dGlvbnMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBwcm94eS5vbihcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJQcm94eSBlcnJvcjpcIiwgZXJyKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHByb3h5Lm9uKFwicHJveHlSZXNcIiwgKHByb3h5UmVzLCByZXEpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJveHkgcmVzcG9uc2U6XCIsIHtcbiAgICAgICAgICAgICAgc3RhdHVzOiBwcm94eVJlcy5zdGF0dXNDb2RlLFxuICAgICAgICAgICAgICB1cmw6IHJlcS51cmwsXG4gICAgICAgICAgICAgIGhlYWRlcnM6IHByb3h5UmVzLmhlYWRlcnNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCIvc3RvcmFnZVwiOiB7XG4gICAgICAgIHRhcmdldDogXCJodHRwczovL2ZpcmViYXNlc3RvcmFnZS5nb29nbGVhcGlzLmNvbVwiLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9zdG9yYWdlLywgXCJcIiksXG4gICAgICB9LFxuICAgICAgJy9hbmRyb2lkTElTU2VydmljZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9saXZlaGVhbHRoLnNvbHV0aW9ucycsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub24oXCJlcnJvclwiLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlByb3h5IGVycm9yOlwiLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKFwicHJveHlSZXFcIiwgKHByb3h5UmVxLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT3V0Z29pbmcgcmVxdWVzdDpcIiwge1xuICAgICAgICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QsXG4gICAgICAgICAgICAgIHVybDogcmVxLnVybCxcbiAgICAgICAgICAgICAgaGVhZGVyczogcHJveHlSZXEuZ2V0SGVhZGVycygpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbihcInByb3h5UmVzXCIsIChwcm94eVJlcywgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkluY29taW5nIHJlc3BvbnNlOlwiLCB7XG4gICAgICAgICAgICAgIHN0YXR1c0NvZGU6IHByb3h5UmVzLnN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgIHVybDogcmVxLnVybCxcbiAgICAgICAgICAgICAgaGVhZGVyczogcHJveHlSZXMuaGVhZGVyc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAnL2dldEFsbFRlc3RzQW5kUHJvZmlsZXMnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vbGl2ZWhlYWx0aC5zb2x1dGlvbnMnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKFwicHJveHlSZXFcIiwgKHByb3h5UmVxKSA9PiB7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ09yaWdpbicsICdodHRwczovL2xpdmVoZWFsdGguc29sdXRpb25zJyk7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICB9LFxuXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtVCxTQUFTLG9CQUFvQjtBQUNoVixP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
