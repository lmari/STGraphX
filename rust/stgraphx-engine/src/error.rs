// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::fmt;

/// Error produced while loading, compiling, or evaluating a model.
#[derive(Debug, Clone, PartialEq)]
pub enum EngineError {
    InvalidJson(String),
    UnsupportedModelVersion(u32),
    EmptyModel,
    DuplicateNodeId(i64),
    DuplicateNodeName(String),
    InvalidNodeName(String),
    UnsupportedNodeType { node: String, node_type: String },
    EmptyExpression(String),
    ExpressionSyntax { node: String, message: String },
    ParameterReference { node: String, reference: String },
    UnknownEdgeEndpoint { edge_id: i64, node_id: i64 },
    IncomingEdgeToParameter(String),
    UnknownReference { node: String, reference: String },
    MissingDependencyEdge { node: String, reference: String },
    DependencyCycle(Vec<String>),
    Evaluation { node: String, message: String },
    NonFiniteValue(String),
}

impl fmt::Display for EngineError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidJson(message) => write!(formatter, "invalid model JSON: {message}"),
            Self::UnsupportedModelVersion(version) => {
                write!(formatter, "unsupported model version {version}")
            }
            Self::EmptyModel => write!(formatter, "the model contains no nodes"),
            Self::DuplicateNodeId(id) => write!(formatter, "duplicate node id {id}"),
            Self::DuplicateNodeName(name) => write!(formatter, "duplicate node name '{name}'"),
            Self::InvalidNodeName(name) => write!(formatter, "invalid node name '{name}'"),
            Self::UnsupportedNodeType { node, node_type } => {
                write!(
                    formatter,
                    "node '{node}' has unsupported type '{node_type}'"
                )
            }
            Self::EmptyExpression(node) => {
                write!(formatter, "node '{node}' has an empty expression")
            }
            Self::ExpressionSyntax { node, message } => {
                write!(formatter, "invalid expression for node '{node}': {message}")
            }
            Self::ParameterReference { node, reference } => write!(
                formatter,
                "parameter '{node}' cannot reference '{reference}' in the first engine slice"
            ),
            Self::UnknownEdgeEndpoint { edge_id, node_id } => write!(
                formatter,
                "edge {edge_id} refers to missing node id {node_id}"
            ),
            Self::IncomingEdgeToParameter(node) => {
                write!(formatter, "parameter '{node}' cannot have incoming edges")
            }
            Self::UnknownReference { node, reference } => {
                write!(
                    formatter,
                    "node '{node}' refers to unknown node '{reference}'"
                )
            }
            Self::MissingDependencyEdge { node, reference } => write!(
                formatter,
                "node '{node}' refers to '{reference}' without an incoming edge"
            ),
            Self::DependencyCycle(nodes) => {
                write!(formatter, "dependency cycle involving {}", nodes.join(", "))
            }
            Self::Evaluation { node, message } => {
                write!(formatter, "cannot evaluate node '{node}': {message}")
            }
            Self::NonFiniteValue(node) => {
                write!(formatter, "node '{node}' produced a non-finite value")
            }
        }
    }
}

impl std::error::Error for EngineError {}
