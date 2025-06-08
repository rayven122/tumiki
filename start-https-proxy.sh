#!/bin/bash

# VM上で@tumiki/proxyServerを動かすために、docker のhttps-portalを立てつつ、pnpm start を動かすコマンド

echo "Starting https-portal with Docker Compose..."
docker compose -f docker/compose.yaml up -d https-portal

echo "Waiting for https-portal to start..."
sleep 5

echo "Starting @tumiki/proxyServer..."
cd apps/proxyServer
pnpm install
pnpm build
pnpm start