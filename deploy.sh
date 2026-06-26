#!/bin/bash
# 一键部署后端到新加坡服务器（只传代码，跳过 node_modules）
# 用法: bash deploy.sh

SERVER="root@47.84.133.41"
KEY="$HOME/.ssh/id_ed25519_github"
DIR="e:/PPY/ClaudeCode/ClaudeDemo/resume-tailor/backend"

echo "📦 打包代码..."
cd "$DIR"
tar -czf /tmp/backend-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='uploads/*' \
  --exclude='.env' \
  --exclude='package-lock.json' \
  server.js routes/ services/ package.json .env.example

echo "🚀 上传到新加坡..."
scp -i "$KEY" /tmp/backend-deploy.tar.gz "$SERVER:~/"

echo "📂 解压并重启..."
ssh -i "$KEY" "$SERVER" "
  cd ~/backend
  tar -xzf ~/backend-deploy.tar.gz
  rm ~/backend-deploy.tar.gz
  npm install --silent
  pm2 restart resume-tailor
"

rm /tmp/backend-deploy.tar.gz
echo "✅ 部署完成！"
