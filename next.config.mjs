/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // La plantilla .docx se lee con fs en tiempo de ejecucion y el rastreo
  // automatico no la detecta, asi que se incluye a mano en el bundle.
  outputFileTracingIncludes: {
    '/api/editores/solicitud': ['./templates/**'],
  },
}

export default nextConfig
