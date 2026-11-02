// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

#![forbid(unsafe_code)]
#![doc = "Platform-independent execution engine for STGraphX."]

/// Information exposed by the engine before model execution is implemented.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EngineInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub api_version: u32,
    pub capabilities: &'static [&'static str],
}

/// Returns the identity and currently implemented capabilities of the engine.
pub const fn engine_info() -> EngineInfo {
    EngineInfo {
        name: "STGraphX Rust engine",
        version: env!("CARGO_PKG_VERSION"),
        api_version: 1,
        capabilities: &[],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scaffold_exposes_identity_without_claiming_capabilities() {
        let info = engine_info();

        assert_eq!(info.name, "STGraphX Rust engine");
        assert_eq!(info.api_version, 1);
        assert!(info.capabilities.is_empty());
    }
}
