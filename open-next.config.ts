import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  worker: {
    output: "_worker.js"
  }
});
