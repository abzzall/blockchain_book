#!/usr/bin/env bash
set -euo pipefail

repository_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-${repository_dir}/.tool-config}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-${repository_dir}/.tool-cache}"

if [[ -x "${HOME}/.foundry/bin/forge" ]]; then
  export PATH="${HOME}/.foundry/bin:${PATH}"
fi

sample_directories=(
  cryptography
  consensus
  wallets
  bitcoin
  ethereum
)

for sample_directory in "${sample_directories[@]}"; do
  echo "==> Testing ${sample_directory}"
  (
    cd "${repository_dir}/${sample_directory}"
    python3 -m unittest discover -v
  )
done

if [[ ! -d "${repository_dir}/node_modules" ]]; then
  echo "Missing node_modules. Run 'npm install' in ${repository_dir}." >&2
  exit 1
fi

echo "==> Testing and building interactive labs"
(
  cd "${repository_dir}"
  npm run check:labs
)

if ! command -v forge >/dev/null 2>&1; then
  echo "Missing forge. Install Foundry from https://getfoundry.sh/ and put forge on PATH." >&2
  exit 1
fi

echo "==> Testing the Foundry project"
(
  cd "${repository_dir}/labs/lab-06-professional-contract-project"
  forge build
  forge test -q
)

echo "All companion-code checks passed."
