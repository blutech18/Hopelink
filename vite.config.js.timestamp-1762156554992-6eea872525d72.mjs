// vite.config.js
import { defineConfig } from "file:///C:/Users/Acer/Downloads/Hopelink%20-%20Capstone%202/Hopelink/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Acer/Downloads/Hopelink%20-%20Capstone%202/Hopelink/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Acer\\Downloads\\Hopelink - Capstone 2\\Hopelink";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router-dom")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/react-hook-form")) {
            return "vendor-forms";
          }
          if (id.includes("node_modules/@react-google-maps")) {
            return "vendor-maps";
          }
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBY2VyXFxcXERvd25sb2Fkc1xcXFxIb3BlbGluayAtIENhcHN0b25lIDJcXFxcSG9wZWxpbmtcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFjZXJcXFxcRG93bmxvYWRzXFxcXEhvcGVsaW5rIC0gQ2Fwc3RvbmUgMlxcXFxIb3BlbGlua1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQWNlci9Eb3dubG9hZHMvSG9wZWxpbmslMjAtJTIwQ2Fwc3RvbmUlMjAyL0hvcGVsaW5rL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgLy8gUmVhY3QgY29yZSBsaWJyYXJpZXNcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdCcpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QtZG9tJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJlYWN0J1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSb3V0ZXJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXItZG9tJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJvdXRlcidcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gRnJhbWVyIE1vdGlvbiAoYW5pbWF0aW9ucylcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9mcmFtZXItbW90aW9uJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLW1vdGlvbidcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gTHVjaWRlIGljb25zXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvbHVjaWRlLXJlYWN0JykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWljb25zJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSYWRpeCBVSSBjb21wb25lbnRzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHJhZGl4LXVpJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXVpJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTdXBhYmFzZVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BzdXBhYmFzZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1zdXBhYmFzZSdcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVhY3QgSG9vayBGb3JtXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QtaG9vay1mb3JtJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWZvcm1zJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBHb29nbGUgTWFwc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0ByZWFjdC1nb29nbGUtbWFwcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1tYXBzJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlciBsYXJnZSBub2RlX21vZHVsZXNcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1taXNjJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDYwMCxcbiAgfSxcbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzVyxTQUFTLG9CQUFvQjtBQUNuWSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYyxDQUFDLE9BQU87QUFFcEIsY0FBSSxHQUFHLFNBQVMsb0JBQW9CLEtBQUssR0FBRyxTQUFTLHdCQUF3QixHQUFHO0FBQzlFLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLCtCQUErQixHQUFHO0FBQ2hELG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLDRCQUE0QixHQUFHO0FBQzdDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLDJCQUEyQixHQUFHO0FBQzVDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLHdCQUF3QixHQUFHO0FBQ3pDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLHdCQUF3QixHQUFHO0FBQ3pDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLDhCQUE4QixHQUFHO0FBQy9DLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLGlDQUFpQyxHQUFHO0FBQ2xELG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
