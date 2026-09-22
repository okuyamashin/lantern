#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
set -a
. "$ROOT/.env"
set +a

if [ -z "${BASIC_AUTH_USER:-}" ] || [ -z "${BASIC_AUTH_PASSWORD:-}" ]; then
  echo "BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が .env にありません" >&2
  exit 1
fi

if [ -z "${VITE_API_BASE:-}" ]; then
  VITE_API_BASE="$(aws cloudformation describe-stacks --region ap-northeast-1 --stack-name lantern-api --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text 2>/dev/null || true)"
  export VITE_API_BASE
fi

npm run build

aws cloudformation deploy \
  --region us-east-1 \
  --stack-name lantern-site \
  --template-file infra/lantern.yaml \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "BasicAuthUser=${BASIC_AUTH_USER}" \
    "BasicAuthPassword=${BASIC_AUTH_PASSWORD}"

BUCKET="$(aws cloudformation describe-stacks --region us-east-1 --stack-name lantern-site --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)"
DIST_ID="$(aws cloudformation describe-stacks --region us-east-1 --stack-name lantern-site --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)"

aws s3 sync dist/web "s3://${BUCKET}" --delete
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null

echo "https://lantern.engawa5656.com"
