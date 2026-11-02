// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::collections::{HashMap, HashSet};

use crate::document::{ExecutionDocument, ModelDocument};
use crate::error::EngineError;
use crate::expression::{self, EvaluationContext, Expression};

const MAX_SIMULATION_STEPS: usize = 100_000;

/// Node kinds supported by the current executable slice of the Rust engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeKind {
    Parameter,
    Algebraic,
    State,
}

/// Numerical integration method selected by the model document.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Integrator {
    Euler,
    Rk4,
}

/// Validated time configuration used by a compiled model.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ExecutionConfig {
    pub t0: f64,
    pub dt: f64,
    pub t1: f64,
    pub integrator: Integrator,
}

impl From<&ExecutionDocument> for ExecutionConfig {
    fn from(document: &ExecutionDocument) -> Self {
        Self {
            t0: document.t0,
            dt: document.dt,
            t1: document.t1,
            integrator: if document.integrator.eq_ignore_ascii_case("rk4") {
                Integrator::Rk4
            } else {
                Integrator::Euler
            },
        }
    }
}

#[derive(Debug, Clone)]
struct CompiledNode {
    id: i64,
    name: String,
    kind: NodeKind,
    expression: Expression,
    initial_expression: Option<Expression>,
    initial_dependencies: Vec<usize>,
    predecessors: Vec<usize>,
}

/// Immutable, validated plan that can be evaluated without reparsing expressions.
#[derive(Debug, Clone)]
pub struct CompiledModel {
    nodes: Vec<CompiledNode>,
    evaluation_order: Vec<usize>,
    initialization_order: Vec<usize>,
    state_indices: Vec<usize>,
    execution: ExecutionConfig,
}

/// Scalar value produced for one node.
#[derive(Debug, Clone, PartialEq)]
pub struct NodeValue {
    pub id: i64,
    pub name: String,
    pub value: f64,
}

/// Values produced by one evaluation of a compiled model.
#[derive(Debug, Clone, PartialEq)]
pub struct Evaluation {
    values: Vec<NodeValue>,
}

impl Evaluation {
    pub fn values(&self) -> &[NodeValue] {
        &self.values
    }

    pub fn value(&self, name: &str) -> Option<f64> {
        self.values
            .iter()
            .find(|node| node.name == name)
            .map(|node| node.value)
    }
}

/// One time-stamped model evaluation in a simulation.
#[derive(Debug, Clone, PartialEq)]
pub struct SimulationSnapshot {
    time: f64,
    evaluation: Evaluation,
}

impl SimulationSnapshot {
    pub fn time(&self) -> f64 {
        self.time
    }

    pub fn evaluation(&self) -> &Evaluation {
        &self.evaluation
    }

    pub fn value(&self, name: &str) -> Option<f64> {
        self.evaluation.value(name)
    }
}

/// Complete sequence of snapshots produced by one simulation run.
#[derive(Debug, Clone, PartialEq)]
pub struct Simulation {
    snapshots: Vec<SimulationSnapshot>,
}

impl Simulation {
    pub fn snapshots(&self) -> &[SimulationSnapshot] {
        &self.snapshots
    }

    pub fn final_snapshot(&self) -> Option<&SimulationSnapshot> {
        self.snapshots.last()
    }
}

/// Loads and compiles a model from the current STGraphX JSON representation.
pub fn compile_json(source: &str) -> Result<CompiledModel, EngineError> {
    let document: ModelDocument = serde_json::from_str(source)
        .map_err(|error| EngineError::InvalidJson(error.to_string()))?;
    CompiledModel::compile(document)
}

impl CompiledModel {
    pub fn compile(document: ModelDocument) -> Result<Self, EngineError> {
        if document.version != 1 {
            return Err(EngineError::UnsupportedModelVersion(document.version));
        }
        if document.nodes.is_empty() {
            return Err(EngineError::EmptyModel);
        }

        let mut id_to_index = HashMap::new();
        let mut name_to_index = HashMap::new();
        for (index, node) in document.nodes.iter().enumerate() {
            if id_to_index.insert(node.id, index).is_some() {
                return Err(EngineError::DuplicateNodeId(node.id));
            }
            if name_to_index.insert(node.name.clone(), index).is_some() {
                return Err(EngineError::DuplicateNodeName(node.name.clone()));
            }
            if !is_valid_node_name(&node.name) {
                return Err(EngineError::InvalidNodeName(node.name.clone()));
            }
        }

        let mut incoming = vec![Vec::new(); document.nodes.len()];
        for edge in &document.edges {
            let Some(&from_index) = id_to_index.get(&edge.from) else {
                return Err(EngineError::UnknownEdgeEndpoint {
                    edge_id: edge.id,
                    node_id: edge.from,
                });
            };
            let Some(&to_index) = id_to_index.get(&edge.to) else {
                return Err(EngineError::UnknownEdgeEndpoint {
                    edge_id: edge.id,
                    node_id: edge.to,
                });
            };
            incoming[to_index].push(from_index);
        }

        let mut nodes = Vec::with_capacity(document.nodes.len());
        for (index, node) in document.nodes.iter().enumerate() {
            let predecessor_names = incoming[index]
                .iter()
                .map(|predecessor| document.nodes[*predecessor].name.as_str())
                .collect::<HashSet<_>>();

            let compiled = match node.node_type.as_str() {
                "parameter" => {
                    if !incoming[index].is_empty() {
                        return Err(EngineError::IncomingEdgeToParameter(node.name.clone()));
                    }
                    let expression = parse_required_expression(
                        &node.name,
                        &node.value_expression,
                        EngineError::EmptyExpression,
                    )?;
                    reject_transition_only_features(&node.name, &expression)?;
                    if let Some(reference) = expression.references().into_iter().next() {
                        return Err(EngineError::ParameterReference {
                            node: node.name.clone(),
                            reference,
                        });
                    }
                    CompiledNode {
                        id: node.id,
                        name: node.name.clone(),
                        kind: NodeKind::Parameter,
                        expression,
                        initial_expression: None,
                        initial_dependencies: Vec::new(),
                        predecessors: incoming[index].clone(),
                    }
                }
                "algebraic" => {
                    let expression = parse_required_expression(
                        &node.name,
                        &node.value_expression,
                        EngineError::EmptyExpression,
                    )?;
                    reject_transition_only_features(&node.name, &expression)?;
                    let dependencies = validate_references(
                        &node.name,
                        &expression,
                        &name_to_index,
                        &predecessor_names,
                        false,
                    )?;
                    CompiledNode {
                        id: node.id,
                        name: node.name.clone(),
                        kind: NodeKind::Algebraic,
                        expression,
                        initial_expression: None,
                        initial_dependencies: dependencies,
                        predecessors: incoming[index].clone(),
                    }
                }
                "state" => {
                    let initial_expression = parse_required_expression(
                        &node.name,
                        &node.initial_state,
                        EngineError::EmptyInitialState,
                    )?;
                    reject_transition_only_features(&node.name, &initial_expression)?;
                    let initial_dependencies = validate_references(
                        &node.name,
                        &initial_expression,
                        &name_to_index,
                        &predecessor_names,
                        false,
                    )?;

                    let transition_expression = parse_required_expression(
                        &node.name,
                        &node.state_transition,
                        EngineError::EmptyStateTransition,
                    )?;
                    validate_references(
                        &node.name,
                        &transition_expression,
                        &name_to_index,
                        &predecessor_names,
                        true,
                    )?;
                    CompiledNode {
                        id: node.id,
                        name: node.name.clone(),
                        kind: NodeKind::State,
                        expression: transition_expression,
                        initial_expression: Some(initial_expression),
                        initial_dependencies,
                        predecessors: incoming[index].clone(),
                    }
                }
                other => {
                    return Err(EngineError::UnsupportedNodeType {
                        node: node.name.clone(),
                        node_type: other.to_string(),
                    })
                }
            };
            nodes.push(compiled);
        }

        let execution = ExecutionConfig::from(&document.execution);
        let state_indices = nodes
            .iter()
            .enumerate()
            .filter_map(|(index, node)| (node.kind == NodeKind::State).then_some(index))
            .collect::<Vec<_>>();
        if !state_indices.is_empty() {
            validate_time_config(execution)?;
            if execution.integrator != Integrator::Euler {
                return Err(EngineError::UnsupportedIntegrator(
                    document.execution.integrator,
                ));
            }
        }

        let evaluation_order = build_evaluation_order(&nodes)?;
        let initialization_order = build_initialization_order(&nodes)?;
        Ok(Self {
            nodes,
            evaluation_order,
            initialization_order,
            state_indices,
            execution,
        })
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn has_state_nodes(&self) -> bool {
        !self.state_indices.is_empty()
    }

    pub fn execution(&self) -> ExecutionConfig {
        self.execution
    }

    /// Returns the order used for parameters and instantaneous algebraic nodes.
    pub fn evaluation_order(&self) -> impl Iterator<Item = &str> {
        self.evaluation_order
            .iter()
            .map(|index| self.nodes[*index].name.as_str())
    }

    /// Evaluates the model at its initial time.
    pub fn evaluate(&self) -> Result<Evaluation, EngineError> {
        let state_values = self.initialize_state_values()?;
        self.evaluate_snapshot(&state_values, self.execution.t0)
            .map(|(evaluation, _)| evaluation)
    }

    /// Runs the model from `t0` to `t1`, including both reachable endpoints.
    pub fn simulate(&self) -> Result<Simulation, EngineError> {
        validate_time_config(self.execution)?;
        if self.has_state_nodes() && self.execution.integrator != Integrator::Euler {
            return Err(EngineError::UnsupportedIntegrator("rk4".to_string()));
        }

        let times = simulation_times(self.execution)?;
        let mut state_values = self.initialize_state_values()?;
        let mut snapshots = Vec::with_capacity(times.len());
        for time in times {
            let (evaluation, next_state_values) =
                self.evaluate_snapshot(&state_values, time)?;
            snapshots.push(SimulationSnapshot { time, evaluation });
            state_values = next_state_values;
        }
        Ok(Simulation { snapshots })
    }

    fn initialize_state_values(&self) -> Result<Vec<Option<f64>>, EngineError> {
        let mut computed = HashMap::with_capacity(self.nodes.len());
        let mut state_values = vec![None; self.nodes.len()];

        for index in &self.initialization_order {
            let node = &self.nodes[*index];
            let expression = node.initial_expression.as_ref().unwrap_or(&node.expression);
            let value = self.evaluate_expression(
                node,
                expression,
                &computed,
                self.execution.t0,
                None,
                false,
            )?;
            computed.insert(node.name.clone(), value);
            if node.kind == NodeKind::State {
                state_values[*index] = Some(value);
            }
        }
        Ok(state_values)
    }

    fn evaluate_snapshot(
        &self,
        state_values: &[Option<f64>],
        time: f64,
    ) -> Result<(Evaluation, Vec<Option<f64>>), EngineError> {
        let mut computed = HashMap::with_capacity(self.nodes.len());
        let mut values_by_index = vec![None; self.nodes.len()];

        for index in &self.state_indices {
            let node = &self.nodes[*index];
            let value = state_values[*index]
                .expect("initialized simulations must contain every state value");
            computed.insert(node.name.clone(), value);
            values_by_index[*index] = Some(value);
        }

        for index in &self.evaluation_order {
            let node = &self.nodes[*index];
            let value =
                self.evaluate_expression(node, &node.expression, &computed, time, None, false)?;
            computed.insert(node.name.clone(), value);
            values_by_index[*index] = Some(value);
        }

        let mut next_state_values = state_values.to_vec();
        for index in &self.state_indices {
            let node = &self.nodes[*index];
            let current = values_by_index[*index]
                .expect("the current state value must have been inserted before transitions");
            let next = self.evaluate_expression(
                node,
                &node.expression,
                &computed,
                time,
                Some(current),
                true,
            )?;
            next_state_values[*index] = Some(next);
        }

        let values = self
            .nodes
            .iter()
            .enumerate()
            .map(|(index, node)| NodeValue {
                id: node.id,
                name: node.name.clone(),
                value: values_by_index[index]
                    .expect("every compiled node must have a value in a snapshot"),
            })
            .collect();
        Ok((Evaluation { values }, next_state_values))
    }

    fn evaluate_expression(
        &self,
        node: &CompiledNode,
        expression: &Expression,
        computed: &HashMap<String, f64>,
        time: f64,
        self_value: Option<f64>,
        allow_integral: bool,
    ) -> Result<f64, EngineError> {
        let value = expression
            .evaluate(&EvaluationContext {
                values: computed,
                time,
                t0: self.execution.t0,
                t1: self.execution.t1,
                dt: self.execution.dt,
                self_value,
                allow_integral,
            })
            .map_err(|message| EngineError::Evaluation {
                node: node.name.clone(),
                message,
            })?;
        if !value.is_finite() {
            return Err(EngineError::NonFiniteValue(node.name.clone()));
        }
        Ok(value)
    }
}

fn parse_required_expression(
    node: &str,
    source: &str,
    empty_error: fn(String) -> EngineError,
) -> Result<Expression, EngineError> {
    let source = source.trim();
    if source.is_empty() {
        return Err(empty_error(node.to_string()));
    }
    expression::parse(source).map_err(|message| EngineError::ExpressionSyntax {
        node: node.to_string(),
        message,
    })
}

fn reject_transition_only_features(
    node: &str,
    expression: &Expression,
) -> Result<(), EngineError> {
    if expression.uses_integral() {
        return Err(EngineError::IntegralOutsideStateTransition(
            node.to_string(),
        ));
    }
    if expression.uses_identifier("this") {
        return Err(EngineError::ThisOutsideStateTransition(node.to_string()));
    }
    Ok(())
}

fn validate_references(
    node: &str,
    expression: &Expression,
    name_to_index: &HashMap<String, usize>,
    predecessor_names: &HashSet<&str>,
    allow_this: bool,
) -> Result<Vec<usize>, EngineError> {
    let mut dependencies = Vec::new();
    for reference in expression.references() {
        if is_execution_global(&reference) || (allow_this && reference == "this") {
            continue;
        }
        let Some(&dependency) = name_to_index.get(&reference) else {
            return Err(EngineError::UnknownReference {
                node: node.to_string(),
                reference,
            });
        };
        if !predecessor_names.contains(reference.as_str()) {
            return Err(EngineError::MissingDependencyEdge {
                node: node.to_string(),
                reference,
            });
        }
        dependencies.push(dependency);
    }
    Ok(dependencies)
}

fn is_execution_global(name: &str) -> bool {
    matches!(name, "time" | "t0" | "t1" | "dt")
}

fn is_valid_node_name(name: &str) -> bool {
    let mut characters = name.chars();
    let Some(first) = characters.next() else {
        return false;
    };
    (first.is_ascii_alphabetic() || first == '_')
        && characters.all(|character| character.is_ascii_alphanumeric() || character == '_')
}

fn build_evaluation_order(nodes: &[CompiledNode]) -> Result<Vec<usize>, EngineError> {
    let mut order = nodes
        .iter()
        .enumerate()
        .filter_map(|(index, node)| (node.kind == NodeKind::Parameter).then_some(index))
        .collect::<Vec<_>>();
    let mut resolved = nodes
        .iter()
        .enumerate()
        .filter_map(|(index, node)| {
            matches!(node.kind, NodeKind::Parameter | NodeKind::State).then_some(index)
        })
        .collect::<HashSet<_>>();
    let mut pending = nodes
        .iter()
        .enumerate()
        .filter_map(|(index, node)| (node.kind == NodeKind::Algebraic).then_some(index))
        .collect::<HashSet<_>>();

    while !pending.is_empty() {
        let mut progressed = false;
        for (index, node) in nodes.iter().enumerate() {
            if !pending.contains(&index) {
                continue;
            }
            if node
                .predecessors
                .iter()
                .all(|predecessor| resolved.contains(predecessor))
            {
                pending.remove(&index);
                resolved.insert(index);
                order.push(index);
                progressed = true;
            }
        }
        if !progressed {
            let cycle = nodes
                .iter()
                .enumerate()
                .filter_map(|(index, node)| pending.contains(&index).then_some(node.name.clone()))
                .collect();
            return Err(EngineError::DependencyCycle(cycle));
        }
    }
    Ok(order)
}

fn build_initialization_order(nodes: &[CompiledNode]) -> Result<Vec<usize>, EngineError> {
    let mut order = Vec::with_capacity(nodes.len());
    let mut resolved = HashSet::new();
    let mut pending = (0..nodes.len()).collect::<HashSet<_>>();

    while !pending.is_empty() {
        let mut progressed = false;
        for (index, node) in nodes.iter().enumerate() {
            if !pending.contains(&index)
                || !node
                    .initial_dependencies
                    .iter()
                    .all(|dependency| resolved.contains(dependency))
            {
                continue;
            }
            pending.remove(&index);
            resolved.insert(index);
            order.push(index);
            progressed = true;
        }
        if !progressed {
            let cycle = nodes
                .iter()
                .enumerate()
                .filter_map(|(index, node)| pending.contains(&index).then_some(node.name.clone()))
                .collect();
            return Err(EngineError::InitializationCycle(cycle));
        }
    }
    Ok(order)
}

fn validate_time_config(execution: ExecutionConfig) -> Result<(), EngineError> {
    if execution.dt == 0.0 {
        return Err(EngineError::InvalidTimeStep);
    }
    if (execution.dt > 0.0 && execution.t0 > execution.t1)
        || (execution.dt < 0.0 && execution.t0 < execution.t1)
    {
        return Err(EngineError::InvalidTimeDirection);
    }
    Ok(())
}

fn simulation_times(execution: ExecutionConfig) -> Result<Vec<f64>, EngineError> {
    let epsilon = f64::max(1e-12, execution.dt.abs() * 1e-9);
    let mut times = Vec::new();
    let mut current = execution.t0;
    for _ in 0..MAX_SIMULATION_STEPS {
        if (execution.dt > 0.0 && current > execution.t1 + epsilon)
            || (execution.dt < 0.0 && current < execution.t1 - epsilon)
        {
            break;
        }
        times.push(current);
        current += execution.dt;
    }
    if times.len() >= MAX_SIMULATION_STEPS {
        return Err(EngineError::SimulationStepLimit(MAX_SIMULATION_STEPS));
    }
    Ok(times)
}
