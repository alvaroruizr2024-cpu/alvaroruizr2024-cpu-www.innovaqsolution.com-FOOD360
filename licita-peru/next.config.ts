import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen autocontenida para Docker / Cloud Run / Railway / Fly. Vercel la ignora.
  output: "standalone",
  serverExternalPackages: ["pdfmake", "exceljs", "mammoth", "unpdf", "pdf-lib", "postgres", "docx", "@aws-sdk/client-s3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
