import type { NextConfig } from "next";

const config: NextConfig = {
  // native / long-running server packages must not be bundled
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "bullmq", "ioredis", "@fal-ai/client"],
  outputFileTracingRoot: __dirname,
};
export default config;
