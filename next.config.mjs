/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  allowedDevOrigins: ['127.0.0.1', '198.18.0.1'],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
};
export default nextConfig;