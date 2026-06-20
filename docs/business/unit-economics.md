# KrattOS — Unit Economics

Two revenue streams: the appliance (one-time) and the seed-pod
subscription (recurring). All figures USD.

---

## Per-unit appliance economics

| Line item | Year-1 single-build | At-scale (1k+ units) |
|-----------|--------------------:|---------------------:|
| Retail price (consumer SKU) | $4,499 | $4,499 |
| Landed cost (from `bom.md`)  | $2,896 | $1,687 |
| Channel cost (10% direct, 30% retail) | $450  | $450 |
| Returns & RMA (3% × landed)  | $87   | $51 |
| **Gross margin per unit**    | **$1,066** | **$2,311** |
| **Gross margin %**           | **24%** | **51%** |

> The single-build margin is intentionally thin — early units exist to
> generate proof, not profit. At-scale margins justify the CapEx for
> tooling.

## Recurring revenue — seed-pod subscription

A monthly mail-out: 4 seed-pods (one per shelf) + nutrient refill +
optional new recipe YAML on the USB stick. No internet required for
the appliance to use them.

| Line item | Per month |
|-----------|----------:|
| Subscription price | $30 |
| Pods + nutrient cost | $7 |
| Fulfilment + shipping (Q4 2025 rates, US) | $6 |
| **Contribution margin** | **$17 / mo = 57%** |

Annual recurring revenue per active appliance: **$360 gross / $204 net**.

## Customer LTV

Assumed lifetime: **5 years** (consumer) / **7 years** (B2B).

| Segment | Hardware GM | 5-yr subscription net | Total LTV |
|---------|------------:|----------------------:|----------:|
| Consumer (at scale) | $2,311 | $1,020 | **$3,331** |
| B2B fleet (7yr, no subs — they buy nutrients bulk) | $1,800 | $0 | **$1,800 × N units** |

## CAC targets

For a healthy 3:1 LTV:CAC ratio:

- **Consumer:** CAC ≤ $1,100. Achievable through restaurant-chef
  influencer placements, food-bloggers, and Crowd Supply launch.
- **B2B:** CAC ≤ $600 per unit (typically $2k–$4k per *deal*, which
  covers a 4–8-unit install).

## Sensitivity table — what kills the model

| Risk | Impact | Mitigation |
|------|-------:|------------|
| Atlas probes 2× price hike | -$110/unit margin | In-house EC/pH at 10k volume |
| Steel tariff +25% | -$65/unit margin | Source cabinet from Mexico or Vietnam |
| Returns rate 8% (target: 3%) | -$210/unit margin | Beefier QA on the hot zone (heater + grinder) |
| Subscription churn 4%/mo (target: 1.5%) | LTV drops by $580 | Recipe variety + community library |
| Power draw 25% higher than spec | Restaurants cite ROI break | Variable-spectrum dimming + smarter scheduler |

## Cash-need model (12 months from pre-seed)

| Bucket | $ |
|--------|--:|
| Hardware bring-up (3 production units, EE consulting, tooling deposits) | $180,000 |
| Founder salaries (2 × $90k) | $180,000 |
| Recipe development + 2 agronomist contracts | $90,000 |
| Pilot installs (10 × $1,500 install + 6 months free subscription) | $35,000 |
| Legal + IP (1 provisional, 2 design patents) | $35,000 |
| Insurance + corp ops | $25,000 |
| Marketing + Crowd Supply launch | $55,000 |
| **Total ask** | **$600,000** |

A $600k–$750k pre-seed at a $4M–$5M post-money cap is a reasonable
ask given the prototype + LOIs milestone.

## SBIR alignment

- **USDA SBIR Phase I:** $175k, food-systems topic — the air-gap +
  local-food angle qualifies cleanly.
- **NSF SBIR Phase I:** $275k, on-device AI / edge ML — the ONNX-on-
  Jetson story is the pitch.

Both are non-dilutive. Win one and the dilutive raise drops to $400k.
