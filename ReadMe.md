run

cd tukiwa: docker compose up -d
cd tukiwa/apps/mobile: pnpm --filter @chama/mobile dev -- -c --tunnel
cd cd tukiwa/apps/api: pnpm --filter @chama/api dev
