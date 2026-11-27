/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  // The Hostinger build copies only the files Next.js detects as used. pdfkit (used by @react-pdf to make
  // the PDF) loads its built-in fonts (.cjs) in a way Next.js doesn't detect, so they were left out and
  // the PDF failed with "Cannot find module .../standard-fonts/Helvetica.cjs". This forces them in.
  outputFileTracingIncludes: {
    '/api/admin/envios/[id]/pdf': ['./node_modules/pdfkit/js/**/*', './node_modules/pdfkit/package.json'],
  },
};

export default nextConfig;
