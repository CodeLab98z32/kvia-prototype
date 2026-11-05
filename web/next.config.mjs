// GitHub Pages serves the site under /<repository-name>; set NEXT_PUBLIC_BASE_PATH="" for a local preview at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/kvia-prototype";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  reactStrictMode: true,
};
export default nextConfig;
