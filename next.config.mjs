/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'mtvehkyansdqiwpddwwa.supabase.co',
            }
        ],
    },
    transpilePackages: ['lucide-react', 'recharts'],
};

export default nextConfig;
