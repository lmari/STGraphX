// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use serde::Deserialize;

fn default_model_version() -> u32 {
    1
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
}

/// Directed dependency stored in an STGraphX model document.
#[derive(Debug, Clone, Deserialize)]
pub struct EdgeDocument {
    #[serde(default)]
    pub id: i64,
    pub from: i64,
    pub to: i64,
}
