/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Empacota o servidor com só as dependências que ele usa de verdade, num
  // `.next/standalone` que roda com `node server.js`. É o que deixa a imagem
  // do contêiner pequena e dispensa levar o node_modules inteiro para dentro.
  output: 'standalone',
  serverExternalPackages: ['googleapis'],
  // Este painel não usa next/image em lugar nenhum: as poucas imagens (logo do
  // ateliê, fotos das peças) vêm do Supabase Storage por <img> comum. Desligar
  // o otimizador fecha a rota /_next/image e, com ela, toda a superfície do
  // sharp/libvips, que é de onde vêm os avisos de segurança que sobram.
  images: { unoptimized: true },
};
export default nextConfig;
