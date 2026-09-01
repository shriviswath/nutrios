/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is fully client-side and local-first; no server runtime is required.
  // Vercel serves this as static output.
  output: "export",
  images: { unoptimized: true },
};
export default nextConfig;
