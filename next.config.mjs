const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "book.krovoro.com",
          },
        ],
        destination: "/book",
      },
    ];
  },
};

export default nextConfig;
