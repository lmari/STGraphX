// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use serde::Deserialize;

fn default_model_version() -> u32 {
    1
}

fn default_time_step() -> f64 {
    1.0
}

fn default_end_time() -> f64 {
    10.0
}

fn default_integrator() -> String {
    "euler".to_string()
}

/// Time configuration read from an STGraphX model document.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionDocument {
    #[serde(default)]
    pub t0: f64,
    #[serde(default = "default_time_step")]
    pub dt: f64,
    #[serde(default = "default_end_time")]
    pub t1: f64,
    #[serde(default = "default_integrator")]
    pub integrator: String,
}

impl Default for ExecutionDocument {
    fn default() -> Self {
        Self {
            t0: 0.0,
            dt: default_time_step(),
            t1: default_end_time(),
            integrator: default_integrator(),
        }
    }
}

/// Minimal part of an STGraphX model document needed by the first engine slice.
#[derive(Debug, Clone, Deserialize)]
pub struct ModelDocument {
    #[serde(default = "default_model_version")]
    pub version: u32,
    #[serde(default)]
    pub nodes: Vec<NodeDocument>,
    #[serde(default)]
    pub edges: Vec<EdgeDocument>,
    #[serde(default)]
    pub execution: ExecutionDocument,
}

/// Node data read from the current STGraphX JSON format.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeDocument {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: String,
    #[serde(default)]
    pub value_expression: String,
    #[serde(default)]
    pub initial_state: String,
    #[serde(default)]
    pub state_transition: String,
}

/// Directed dependency stored in an STGraphX model document.
#[derive(Debug, Clone, Deserialize)]
pub struct EdgeDocument {
    #[serde(default)]
    pub id: i64,
    pub from: i64,
    pub to: i64,
}
