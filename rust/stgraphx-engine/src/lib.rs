// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

#![forbid(unsafe_code)]
#![doc = "Platform-independent execution engine for STGraphX."]

mod document;
mod error;
mod expression;
mod functions;
mod model;
mod value;

pub use document::{
    EdgeDocument, ExecutionDocument, LocalFunctionDocument, ModelDocument, NodeDocument,
};
pub use error::EngineError;
pub use model::{
    compile_json, CompiledModel, Evaluation, ExecutionConfig, Integrator, NodeKind, NodeValue,
    Simulation, SimulationSnapshot,
};
pub use value::{Tensor, Value};

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
        capabilities: &[
            "scalar-parameters",
            "scalar-algebraic-nodes",
            "arithmetic-expressions",
            "scalar-state-nodes",
            "discrete-state-transitions",
            "euler-integration",
            "time-series-simulation",
            "numeric-tensors",
            "vector-matrix-arithmetic",
            "comparisons-and-logic",
            "vectorized-conditionals",
            "built-in-numeric-functions",
            "tensor-reducers",
            "tensor-indexing-and-slicing",
            "model-local-functions",
            "rk4-pure-integral",
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_exposes_identity_and_first_capabilities() {
        let info = engine_info();

        assert_eq!(info.name, "STGraphX Rust engine");
        assert_eq!(info.api_version, 1);
        assert!(info.capabilities.contains(&"scalar-algebraic-nodes"));
        assert!(info.capabilities.contains(&"scalar-state-nodes"));
    }
}
