// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::cell::Cell;

const UINT32_RANGE: f64 = 4_294_967_296.0;

/// Per-execution pseudo-random generator compatible with the JavaScript
/// reference engine. A fresh instance is created for every model run.
#[derive(Debug)]
pub(crate) struct RandomGenerator {
    state: Cell<Option<u32>>,
}

impl RandomGenerator {
    pub(crate) fn new(seed: Option<u32>) -> Self {
        Self {
            state: Cell::new(seed),
        }
    }

    pub(crate) fn next(&self) -> Result<f64, String> {
        let state = self
            .state
            .get()
            .ok_or_else(|| "random functions require execution.randomSeed".to_string())?
            .wrapping_add(0x6D2B_79F5);
        self.state.set(Some(state));

        let mut mixed = (state ^ (state >> 15)).wrapping_mul(state | 1);
        mixed ^= mixed.wrapping_add((mixed ^ (mixed >> 7)).wrapping_mul(mixed | 61));
        Ok((mixed ^ (mixed >> 14)) as f64 / UINT32_RANGE)
    }
}

/// Mirrors JavaScript's `Number.isInteger(value) ? value >>> 0 : null`.
pub(crate) fn normalize_seed(value: Option<f64>) -> Option<u32> {
    let value = value?;
    if !value.is_finite() || value.fract() != 0.0 {
        return None;
    }

    let modulo = value % UINT32_RANGE;
    let normalized = if modulo < 0.0 {
        modulo + UINT32_RANGE
    } else {
        modulo
    };
    Some(normalized as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_seeds_like_javascript_uint32_conversion() {
        assert_eq!(normalize_seed(Some(0.0)), Some(0));
        assert_eq!(normalize_seed(Some(-1.0)), Some(u32::MAX));
        assert_eq!(normalize_seed(Some(UINT32_RANGE + 7.0)), Some(7));
        assert_eq!(normalize_seed(Some(1.5)), None);
        assert_eq!(normalize_seed(None), None);
    }

    #[test]
    fn produces_the_reference_mulberry32_sequence() {
        let random = RandomGenerator::new(Some(123_456_789));
        let expected = [
            0.257_790_743_838_995_7,
            0.970_772_111_555_561_4,
            0.785_328_014_288_097_6,
            0.206_164_579_838_514_33,
        ];

        for expected in expected {
            assert_eq!(random.next(), Ok(expected));
        }
    }

    #[test]
    fn rejects_random_draws_without_a_seed() {
        let error = RandomGenerator::new(None)
            .next()
            .expect_err("an unseeded core run should be explicit");
        assert_eq!(error, "random functions require execution.randomSeed");
    }
}
