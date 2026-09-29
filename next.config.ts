import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/d/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Imagens do painel: até 3 MB por arquivo (validado no servidor e no Apps Script).
      // Fica abaixo do limite de 4,5 MB por requisição da Vercel.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
