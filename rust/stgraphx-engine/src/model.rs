// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::collections::{HashMap, HashSet};

use crate::document::{ExecutionDocument, LocalFunctionDocument, ModelDocument};
use crate::error::EngineError;
use crate::expression::{self, EvaluationContext, Expression, LocalFunction};
use crate::functions;
use crate::value::Value;

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
    integral_derivative: Option<Expression>,
    initial_expression: Option<Expression>,
    initial_dependencies: Vec<usize>,
    predecessors: Vec<usize>,
}

/// Immutable, validated plan that can be evaluated without reparsing expressions.
#[derive(Debug, Clone)]
pub struct CompiledModel {
    nodes: Vec<CompiledNode>,
    local_functions: HashMap<String, LocalFunction>,
    evaluation_order: Vec<usize>,
    initialization_order: Vec<usize>,
    state_indices: Vec<usize>,
    rk4_state_indices: Vec<usize>,
    execution: ExecutionConfig,
}

/// Numeric value produced for one node.
#[derive(Debug, Clone, PartialEq)]
pub struct NodeValue {
    pub id: i64,
    pub name: String,
    pub value: Value,
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

    pub fn value(&self, name: &str) -> Option<&Value> {
        self.values
            .iter()
            .find(|node| node.name == name)
            .map(|node| &node.value)
    }

    pub fn scalar(&self, name: &str) -> Option<f64> {
        self.value(name).and_then(Value::as_scalar)
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

    pub fn value(&self, name: &str) -> Option<&Value> {
        self.evaluation.value(name)
    }

    pub fn scalar(&self, name: &str) -> Option<f64> {
        self.evaluation.scalar(name)
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

        let local_functions = compile_local_functions(&document.local_functions, &name_to_index)?;

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
                        integral_derivative: None,
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
                        integral_derivative: None,
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
                    let integral_derivative = transition_expression
                        .pure_integral_argument()
                        .cloned();
                    CompiledNode {
                        id: node.id,
                        name: node.name.clone(),
                        kind: NodeKind::State,
                        expression: transition_expression,
                        integral_derivative,
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
            if execution.integrator == Integrator::Rk4 {
                for index in &state_indices {
                    let node = &nodes[*index];
                    if node.expression.uses_integral() && node.integral_derivative.is_none() {
                        return Err(EngineError::UnsupportedRk4Transition(node.name.clone()));
                    }
                }
            }
        }
        let rk4_state_indices = if execution.integrator == Integrator::Rk4 {
            state_indices
                .iter()
                .copied()
                .filter(|index| nodes[*index].integral_derivative.is_some())
                .collect()
        } else {
            Vec::new()
        };

        let evaluation_order = build_evaluation_order(&nodes)?;
        let initialization_order = build_initialization_order(&nodes)?;
        Ok(Self {
            nodes,
            local_functions,
            evaluation_order,
            initialization_order,
            state_indices,
            rk4_state_indices,
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

        let times = simulation_times(self.execution)?;
        let mut state_values = self.initialize_state_values()?;
        let mut snapshots = Vec::with_capacity(times.len());
        for time in times {
            let (evaluation, next_state_values) = self.evaluate_snapshot(&state_values, time)?;
            snapshots.push(SimulationSnapshot { time, evaluation });
            state_values = next_state_values;
        }
        Ok(Simulation { snapshots })
    }

    fn initialize_state_values(&self) -> Result<Vec<Option<Value>>, EngineError> {
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
            computed.insert(node.name.clone(), value.clone());
            if node.kind == NodeKind::State {
                state_values[*index] = Some(value);
            }
        }
        Ok(state_values)
    }

    fn evaluate_snapshot(
        &self,
        state_values: &[Option<Value>],
        time: f64,
    ) -> Result<(Evaluation, Vec<Option<Value>>), EngineError> {
        let (computed, values_by_index) = self.evaluate_current_values(state_values, time)?;
        let next_state_values = match self.execution.integrator {
            Integrator::Euler => {
                self.evaluate_euler_transitions(state_values, &computed, time)?
            }
            Integrator::Rk4 => self.evaluate_rk4_transitions(state_values, &computed, time)?,
        };

        let values = self
            .nodes
            .iter()
            .enumerate()
            .map(|(index, node)| NodeValue {
                id: node.id,
                name: node.name.clone(),
                value: values_by_index[index]
                    .as_ref()
                    .cloned()
                    .expect("every compiled node must have a value in a snapshot"),
            })
            .collect();
        Ok((Evaluation { values }, next_state_values))
    }

    fn evaluate_current_values(
        &self,
        state_values: &[Option<Value>],
        time: f64,
    ) -> Result<(HashMap<String, Value>, Vec<Option<Value>>), EngineError> {
        let mut computed = HashMap::with_capacity(self.nodes.len());
        let mut values_by_index = vec![None; self.nodes.len()];

        for index in &self.state_indices {
            let node = &self.nodes[*index];
            let value = state_values[*index]
                .as_ref()
                .cloned()
                .expect("initialized simulations must contain every state value");
            computed.insert(node.name.clone(), value.clone());
            values_by_index[*index] = Some(value);
        }

        for index in &self.evaluation_order {
            let node = &self.nodes[*index];
            let value =
                self.evaluate_expression(node, &node.expression, &computed, time, None, false)?;
            computed.insert(node.name.clone(), value.clone());
            values_by_index[*index] = Some(value);
        }

        Ok((computed, values_by_index))
    }

    fn evaluate_euler_transitions(
        &self,
        state_values: &[Option<Value>],
        computed: &HashMap<String, Value>,
        time: f64,
    ) -> Result<Vec<Option<Value>>, EngineError> {
        let mut next_state_values = state_values.to_vec();
        for index in &self.state_indices {
            let node = &self.nodes[*index];
            let current = state_values[*index]
                .as_ref()
                .expect("initialized simulations must contain every state value");
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
        Ok(next_state_values)
    }

    fn evaluate_rk4_transitions(
        &self,
        state_values: &[Option<Value>],
        computed: &HashMap<String, Value>,
        time: f64,
    ) -> Result<Vec<Option<Value>>, EngineError> {
        let mut next_state_values = state_values.to_vec();
        for index in &self.state_indices {
            let node = &self.nodes[*index];
            if node.integral_derivative.is_some() {
                continue;
            }
            let current = state_values[*index]
                .as_ref()
                .expect("initialized simulations must contain every state value");
            next_state_values[*index] = Some(self.evaluate_expression(
                node,
                &node.expression,
                computed,
                time,
                Some(current),
                false,
            )?);
        }
        if self.rk4_state_indices.is_empty() {
            return Ok(next_state_values);
        }

        let k1 = self.evaluate_rk4_derivatives(state_values, computed, time)?;
        let stage2 = self.rk4_stage_values(state_values, &k1, self.execution.dt / 2.0)?;
        let k2 = self.evaluate_rk4_derivatives_at_state(&stage2, time + self.execution.dt / 2.0)?;
        let stage3 = self.rk4_stage_values(state_values, &k2, self.execution.dt / 2.0)?;
        let k3 = self.evaluate_rk4_derivatives_at_state(&stage3, time + self.execution.dt / 2.0)?;
        let stage4 = self.rk4_stage_values(state_values, &k3, self.execution.dt)?;
        let k4 = self.evaluate_rk4_derivatives_at_state(&stage4, time + self.execution.dt)?;

        for index in &self.rk4_state_indices {
            let node = &self.nodes[*index];
            let current = state_values[*index]
                .as_ref()
                .expect("initialized simulations must contain every state value");
            let next = current
                .rk4_integrate(
                    k1[*index].as_ref().expect("RK4 k1 must be available"),
                    k2[*index].as_ref().expect("RK4 k2 must be available"),
                    k3[*index].as_ref().expect("RK4 k3 must be available"),
                    k4[*index].as_ref().expect("RK4 k4 must be available"),
                    self.execution.dt,
                )
                .map_err(|message| EngineError::Evaluation {
                    node: node.name.clone(),
                    message,
                })?;
            if !next.is_finite() {
                return Err(EngineError::NonFiniteValue(node.name.clone()));
            }
            next_state_values[*index] = Some(next);
        }
        Ok(next_state_values)
    }

    fn evaluate_rk4_derivatives_at_state(
        &self,
        state_values: &[Option<Value>],
        time: f64,
    ) -> Result<Vec<Option<Value>>, EngineError> {
        let (computed, _) = self.evaluate_current_values(state_values, time)?;
        self.evaluate_rk4_derivatives(state_values, &computed, time)
    }

    fn evaluate_rk4_derivatives(
        &self,
        state_values: &[Option<Value>],
        computed: &HashMap<String, Value>,
        time: f64,
    ) -> Result<Vec<Option<Value>>, EngineError> {
        let mut derivatives = vec![None; self.nodes.len()];
        for index in &self.rk4_state_indices {
            let node = &self.nodes[*index];
            let current = state_values[*index]
                .as_ref()
                .expect("initialized simulations must contain every state value");
            let derivative = self.evaluate_expression(
                node,
                node.integral_derivative
                    .as_ref()
                    .expect("RK4 states must contain a derivative"),
                computed,
                time,
                Some(current),
                false,
            )?;
            derivatives[*index] = Some(derivative);
        }
        Ok(derivatives)
    }

    fn rk4_stage_values(
        &self,
        current_values: &[Option<Value>],
        derivatives: &[Option<Value>],
        factor: f64,
    ) -> Result<Vec<Option<Value>>, EngineError> {
        let mut stage_values = current_values.to_vec();
        for index in &self.rk4_state_indices {
            let node = &self.nodes[*index];
            let current = current_values[*index]
                .as_ref()
                .expect("initialized simulations must contain every state value");
            let derivative = derivatives[*index]
                .as_ref()
                .expect("every RK4 stage must contain every derivative");
            let stage = current.euler_integrate(derivative, factor).map_err(|message| {
                EngineError::Evaluation {
                    node: node.name.clone(),
                    message,
                }
            })?;
            if !stage.is_finite() {
                return Err(EngineError::NonFiniteValue(node.name.clone()));
            }
            stage_values[*index] = Some(stage);
        }
        Ok(stage_values)
    }

    fn evaluate_expression(
        &self,
        node: &CompiledNode,
        expression: &Expression,
        computed: &HashMap<String, Value>,
        time: f64,
        self_value: Option<&Value>,
        allow_integral: bool,
    ) -> Result<Value, EngineError> {
        let value = expression
            .evaluate(&EvaluationContext {
                values: computed,
                time,
                t0: self.execution.t0,
                t1: self.execution.t1,
                dt: self.execution.dt,
                self_value,
                allow_integral,
                local_functions: &self.local_functions,
                local_function_stack: &[],
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

fn compile_local_functions(
    documents: &[LocalFunctionDocument],
    node_names: &HashMap<String, usize>,
) -> Result<HashMap<String, LocalFunction>, EngineError> {
    let mut names = HashSet::new();
    let mut order = Vec::with_capacity(documents.len());
    for document in documents {
        if !is_valid_node_name(&document.name)
            || is_reserved_local_name(&document.name)
            || functions::is_supported(&document.name)
        {
            return Err(EngineError::InvalidLocalFunction {
                name: document.name.clone(),
                message: "the name is invalid or reserved".to_string(),
            });
        }
        if !names.insert(document.name.clone()) {
            return Err(EngineError::DuplicateLocalFunctionName(
                document.name.clone(),
            ));
        }
        if node_names.contains_key(&document.name) {
            return Err(EngineError::LocalFunctionNodeConflict(
                document.name.clone(),
            ));
        }
        order.push(document.name.clone());
    }

    let mut compiled = HashMap::with_capacity(documents.len());
    let mut dependencies = HashMap::with_capacity(documents.len());
    for document in documents {
        let mut params = HashSet::new();
        for param in &document.params {
            if !is_valid_node_name(param)
                || is_reserved_local_name(param)
                || functions::is_supported(param)
            {
                return Err(EngineError::InvalidLocalFunction {
                    name: document.name.clone(),
                    message: format!("parameter '{param}' is invalid or reserved"),
                });
            }
            if !params.insert(param.clone()) {
                return Err(EngineError::InvalidLocalFunction {
                    name: document.name.clone(),
                    message: format!("parameter '{param}' is duplicated"),
                });
            }
        }

        let source = document.expression.trim();
        if source.is_empty() {
            return Err(EngineError::InvalidLocalFunction {
                name: document.name.clone(),
                message: "the expression is empty".to_string(),
            });
        }
        let expression =
            expression::parse(source).map_err(|message| EngineError::InvalidLocalFunction {
                name: document.name.clone(),
                message,
            })?;
        if expression.uses_integral() || expression.uses_identifier("this") {
            return Err(EngineError::InvalidLocalFunction {
                name: document.name.clone(),
                message: "'this' and 'integral' are unavailable in local functions".to_string(),
            });
        }
        for reference in expression.references() {
            if !params.contains(&reference) && !is_execution_global(&reference) {
                return Err(EngineError::InvalidLocalFunction {
                    name: document.name.clone(),
                    message: format!("unknown reference '{reference}'"),
                });
            }
        }

        let mut local_dependencies = Vec::new();
        for call in expression.calls() {
            if names.contains(&call) {
                local_dependencies.push(call);
            } else if call != "if" && !functions::is_supported(&call) {
                return Err(EngineError::InvalidLocalFunction {
                    name: document.name.clone(),
                    message: format!("unknown function '{call}'"),
                });
            }
        }
        dependencies.insert(document.name.clone(), local_dependencies);
        compiled.insert(
            document.name.clone(),
            LocalFunction {
                params: document.params.clone(),
                expression,
            },
        );
    }

    if let Some(cycle) = local_function_cycle(&order, &dependencies) {
        return Err(EngineError::LocalFunctionCycle(cycle));
    }
    Ok(compiled)
}

fn local_function_cycle(
    order: &[String],
    dependencies: &HashMap<String, Vec<String>>,
) -> Option<Vec<String>> {
    fn visit(
        name: &str,
        dependencies: &HashMap<String, Vec<String>>,
        stack: &mut Vec<String>,
        visited: &mut HashSet<String>,
    ) -> Option<Vec<String>> {
        if let Some(start) = stack.iter().position(|active| active == name) {
            let mut cycle = stack[start..].to_vec();
            cycle.push(name.to_string());
            return Some(cycle);
        }
        if visited.contains(name) {
            return None;
        }
        stack.push(name.to_string());
        for dependency in dependencies.get(name).into_iter().flatten() {
            if let Some(cycle) = visit(dependency, dependencies, stack, visited) {
                return Some(cycle);
            }
        }
        stack.pop();
        visited.insert(name.to_string());
        None
    }

    let mut visited = HashSet::new();
    for name in order {
        if let Some(cycle) = visit(name, dependencies, &mut Vec::new(), &mut visited) {
            return Some(cycle);
        }
    }
    None
}

fn is_reserved_local_name(name: &str) -> bool {
    matches!(
        name,
        "break"
            | "case"
            | "catch"
            | "class"
            | "const"
            | "continue"
            | "debugger"
            | "default"
            | "delete"
            | "do"
            | "else"
            | "export"
            | "extends"
            | "finally"
            | "for"
            | "function"
            | "if"
            | "import"
            | "in"
            | "instanceof"
            | "let"
            | "new"
            | "return"
            | "super"
            | "switch"
            | "this"
            | "throw"
            | "try"
            | "typeof"
            | "var"
            | "void"
            | "while"
            | "with"
            | "yield"
            | "enum"
            | "await"
            | "implements"
            | "interface"
            | "package"
            | "private"
            | "protected"
            | "public"
            | "static"
            | "null"
            | "true"
            | "false"
            | "time"
            | "t0"
            | "t1"
            | "dt"
            | "and"
            | "or"
            | "not"
            | "integral"
    )
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

fn reject_transition_only_features(node: &str, expression: &Expression) -> Result<(), EngineError> {
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
