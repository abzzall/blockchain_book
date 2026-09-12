#!/usr/bin/env bash
set -euo pipefail

repository_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-${repository_dir}/.tool-config}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-${repository_dir}/.tool-cache}"

if [[ -x "${HOME}/.foundry/bin/forge" ]]; then
  export PATH="${HOME}/.foundry/bin:${PATH}"
fi

# Standalone npm projects: these are deliberately not root workspaces, because
# each documents its own "npm ci" in its chapter README and each pins its own
# package-lock.json. Install them here so that a clean checkout needs nothing
# beyond the two commands the README quick start gives.
install_standalone() {
  local project_dir="${repository_dir}/$1"
  if [[ ! -d "${project_dir}/node_modules" ]]; then
    echo "==> Installing ${1}"
    (cd "${project_dir}" && npm ci)
  fi
}

sample_directories=(
  part-01-blockchain-foundations/cryptography
  part-01-blockchain-foundations/consensus
  part-01-blockchain-foundations/wallets
  part-02-bitcoin/bitcoin
  part-03-ethereum/ethereum
  part-01-blockchain-foundations/labs/lab-13-digital-signatures
  part-03-ethereum/labs/lab-14-applying-a-block
  part-13-privacy-identity-and-transparency/labs/lab-17-unlinkability-and-clustering
  part-15-institutions-and-compliance-concepts/labs/lab-18-exposure-scoring
)

for sample_directory in "${sample_directories[@]}"; do
  echo "==> Testing ${sample_directory}"
  (
    cd "${repository_dir}/${sample_directory}"
    python3 -m unittest discover -v
  )
done

if [[ ! -d "${repository_dir}/node_modules" ]]; then
  echo "Missing node_modules. Run 'npm ci' in ${repository_dir}." >&2
  exit 1
fi

echo "==> Testing the chapter 21 JavaScript samples"
install_standalone part-06-decentralised-applications-and-modern-web3-development/javascript
(
  cd "${repository_dir}/part-06-decentralised-applications-and-modern-web3-development/javascript"
  npm test
)

echo "==> Testing the chapter 21 guided walkthrough (full-code)"
install_standalone part-06-decentralised-applications-and-modern-web3-development/javascript-guided/full-code
(
  cd "${repository_dir}/part-06-decentralised-applications-and-modern-web3-development/javascript-guided/full-code"
  npm test
)

echo "==> Testing the chapter 20 React dApp walkthrough (full-code)"
install_standalone part-06-decentralised-applications-and-modern-web3-development/react-dapp-guided/full-code
(
  cd "${repository_dir}/part-06-decentralised-applications-and-modern-web3-development/react-dapp-guided/full-code"
  npm test
  npm run build
)

echo "==> Testing the chapter 23, 25, and 27 Hardhat samples"
install_standalone part-07-development-tools/hardhat
(
  cd "${repository_dir}/part-07-development-tools/hardhat"
  npm run build
  npm test
)

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
  cd "${repository_dir}/part-07-development-tools/labs/lab-06-professional-contract-project"
  forge build
  forge test -q
)

foundry_directories=(
  part-05-smart-contracts-and-solidity/solidity
  part-08-tokens-and-digital-assets/nft
  part-09-decentralised-finance/defi
  part-10-decentralised-autonomous-organisations-and-governance/dao
  part-13-privacy-identity-and-transparency/privacy
  part-14-security-fraud-and-user-safety/security
)

for foundry_directory in "${foundry_directories[@]}"; do
  echo "==> Testing ${foundry_directory}"
  (
    cd "${repository_dir}/${foundry_directory}"
    forge build
    forge test -q
  )
done

echo "All companion-code checks passed."
