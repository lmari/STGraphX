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
    DuplicateLocalFunctionName(String),
    LocalFunctionNodeConflict(String),
    InvalidLocalFunction { name: String, message: String },
    LocalFunctionCycle(Vec<String>),
    UnsupportedNodeType { node: String, node_type: String },
    EmptyExpression(String),
    EmptyInitialState(String),
    EmptyStateTransition(String),
    ExpressionSyntax { node: String, message: String },
    IntegralOutsideStateTransition(String),
    ThisOutsideStateTransition(String),
    ParameterReference { node: String, reference: String },
    UnknownEdgeEndpoint { edge_id: i64, node_id: i64 },
    IncomingEdgeToParameter(String),
    UnknownReference { node: String, reference: String },
    MissingDependencyEdge { node: String, reference: String },
    DependencyCycle(Vec<String>),
    InitializationCycle(Vec<String>),
    InvalidTimeStep,
    InvalidTimeDirection,
    UnsupportedIntegrator(String),
    SimulationStepLimit(usize),
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
            Self::DuplicateLocalFunctionName(name) => {
                write!(formatter, "duplicate local function name '{name}'")
            }
            Self::LocalFunctionNodeConflict(name) => {
                write!(
                    formatter,
                    "local function '{name}' conflicts with a node name"
                )
            }
            Self::InvalidLocalFunction { name, message } => {
                write!(formatter, "invalid local function '{name}': {message}")
            }
            Self::LocalFunctionCycle(functions) => write!(
                formatter,
                "local function dependency cycle involving {}",
                functions.join(" -> ")
            ),
            Self::UnsupportedNodeType { node, node_type } => {
                write!(
                    formatter,
                    "node '{node}' has unsupported type '{node_type}'"
                )
            }
            Self::EmptyExpression(node) => {
                write!(formatter, "node '{node}' has an empty expression")
            }
            Self::EmptyInitialState(node) => {
                write!(formatter, "state node '{node}' has an empty initial state")
            }
            Self::EmptyStateTransition(node) => {
                write!(formatter, "state node '{node}' has an empty transition")
            }
            Self::ExpressionSyntax { node, message } => {
                write!(formatter, "invalid expression for node '{node}': {message}")
            }
            Self::IntegralOutsideStateTransition(node) => write!(
                formatter,
                "'integral' is only available in the transition of state node '{node}'"
            ),
            Self::ThisOutsideStateTransition(node) => write!(
                formatter,
                "'this' is only available in the transition of state node '{node}'"
            ),
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
            Self::InitializationCycle(nodes) => write!(
                formatter,
                "initialization dependency cycle involving {}",
                nodes.join(", ")
            ),
            Self::InvalidTimeStep => write!(formatter, "the simulation time step cannot be zero"),
            Self::InvalidTimeDirection => write!(
                formatter,
                "the simulation time step points away from the end time"
            ),
            Self::UnsupportedIntegrator(integrator) => {
                write!(formatter, "unsupported integrator '{integrator}'")
            }
            Self::SimulationStepLimit(limit) => {
                write!(formatter, "the simulation requires at least {limit} steps")
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
