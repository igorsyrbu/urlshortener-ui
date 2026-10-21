import "dotenv/config";
import { createApp } from "./app";
import { readMockConfig } from "./config";

const config = readMockConfig();

createApp({ config }).listen(config.port, () => {
  console.log(`\n🚀 Mock server running at http://localhost:${config.port}`);
  console.log(`  Frontend URL: ${config.frontendUrl}`);
  console.log(`  Artificial delay: ${config.delayMs}ms`);
  console.log(`  Error simulation: send header "x-mock-error: true"`);
  console.log(`  Cookie settings: sameSite=${config.cookie.sameSite}, secure=${config.cookie.secure}`);
  console.log(`  Billing: scenario=${config.billing.scenario}, portal expiry=${config.billing.portalExpiry}\n`);
});
