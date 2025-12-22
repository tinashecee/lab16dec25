import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// This is the main configuration file for Vite, a modern frontend build tool
export default defineConfig({
  // Configure plugins - in this case, we're using the React plugin for Vite
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],

  // Configuration for dependency optimization
  optimizeDeps: {
    // Exclude specific packages from dependency pre-bundling
    exclude: ["lucide-react"],
    // Explicitly include packages in dependency pre-bundling
    include: ["xlsx", "react", "react-dom"],
    esbuildOptions: {
      jsx: 'automatic',
    },
  },

  // Build-specific configurations
  build: {
    // Configure how CommonJS dependencies are processed
    commonjsOptions: {
      // Transform all CommonJS modules
      transformMixedEsModules: true,
      strictRequires: false,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },

  // Development server configurations
  server: {
    host: '0.0.0.0', 
    hmr: {
      overlay: false
    },
    allowedHosts: ['app.labpartners.co.zw'],
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },    
    // Proxy configuration for handling API requests during development
    proxy: {
      // First proxy rule for '/livehealth' requests
      "/livehealth": {
        // Redirect requests to this target URL
        target: "https://livehealth.solutions",
        // Enable CORS by changing request origin to match target URL
        changeOrigin: true,
        // Remove '/livehealth' prefix when forwarding the request
        rewrite: (path) => path.replace(/^\/livehealth/, ""),
        // Disable SSL certificate validation (useful in development)
        secure: false,
        // Advanced proxy configuration with event listeners
        configure: (proxy, _options) => {
          // Handle proxy errors
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });

          // Log outgoing requests
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
            console.log("Request Headers:", proxyReq.getHeaders());
          });

          // Log incoming responses
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from the Target:", {
              statusCode: proxyRes.statusCode,
              url: req.url,
              headers: proxyRes.headers,
            });
          });
        },
      },

      // Second proxy rule for '/api' requests
      "/api": {
        target: "https://livehealth.solutions",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://livehealth.solutions');
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
        rewrite: (path) => path.replace(/^\/storage/, ""),
      },
      '/androidLISService': {
        target: 'https://livehealth.solutions',
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
      '/getAllTestsAndProfiles': {
        target: 'https://livehealth.solutions',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://livehealth.solutions');
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
            proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          });
        }
      }
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  
  // Ensure proper handling of React in build
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
