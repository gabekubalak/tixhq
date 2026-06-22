.PHONY: help verify rust-check rust-build rust-test python-check schemas sim clean \
        install-greenhouse-v1 install-cabinet-v1 install-shelf-mini-v1

help:  ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

verify: ## Run every sanity check that does not require hardware
	bash scripts/verify.sh

rust-check: ## cargo check across the workspace
	cargo check --workspace

rust-build: ## cargo build --release across the workspace
	cargo build --workspace --release

rust-test: ## Run the Rust unit tests
	cargo test --workspace

python-check: ## Byte-compile Python and run frame round-trip tests
	python3 -m compileall -q services tests ui/backend
	PYTHONPATH=services/sensor-ingest python3 -m pytest tests/unit -q

schemas: ## Validate JSON Schemas and YAML recipes
	python3 scripts/validate_schemas.py

sim: ## Run the simulated zone against a local NATS bus
	python3 tests/sim/simulated_zone.py

clean: ## Remove build artifacts
	cargo clean
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf ui/frontend/node_modules ui/frontend/.svelte-kit ui/frontend/build

install-greenhouse-v1: ## Install KrattOS as a greenhouse (Pi or Linux box)
	@bash scripts/install_profile.sh greenhouse-v1

install-cabinet-v1: ## Install KrattOS as the full indoor appliance
	@bash scripts/install_profile.sh cabinet-v1

install-shelf-mini-v1: ## Install KrattOS as a single-shelf Nano
	@bash scripts/install_profile.sh shelf-mini-v1
