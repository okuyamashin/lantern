#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
set -a
. "$ROOT/.env"
set +a

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "OPENAI_API_KEY が .env にありません" >&2
  exit 1
fi

npm run build:aws

sam deploy \
  --template-file infra/template.yaml \
  --stack-name lantern-api \
  --region ap-northeast-1 \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "OpenAIApiKey=${OPENAI_API_KEY}"

aws cloudformation describe-stacks \
  --region ap-northeast-1 \
  --stack-name lantern-api \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
