// Geometry for the V1 hoop house: ~14 ft wide, ~30 ft long, ~8 ft to
// the apex, 7 hoops on ~4 ft centers. All metres. Easy to swap if the
// real site comes in different.

export const GREENHOUSE_DIMS = {
  width_m:          4.27,   // 14 ft
  length_m:         9.14,   // 30 ft
  peak_height_m:    2.44,   // 8 ft
  sidewall_height_m: 0.0,   // pure hoop house, no knee wall
  skin_radius_m:    0.005,
  hoop_count:       7,
  beds:             4       // Pragmatic V1 starts with 4 beds (2 per side)
};
