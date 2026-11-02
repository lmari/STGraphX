// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::collections::{HashMap, HashSet};

use crate::document::ModelDocument;
use crate::error::EngineError;
use crate::expression::{self, Expression};

/// Node kinds supported by the first executable slice of the Rust engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeKind {
    Parameter,
    Algebraic,
}

#[derive(Debug, Clone)]
struct CompiledNode {
    id: i64,
    name: String,
    kind: NodeKind,
    expression: Expression,
    predecessors: Vec<usize>,
}

/// Immutable, validated plan that can be evaluated without reparsing expressions.
#[derive(Debug, Clone)]
pub struct CompiledModel {
    nodes: Vec<CompiledNode>,
    evaluation_order: Vec<usize>,
}

/// Scalar value produced for one node.
#[derive(Debug, Clone, PartialEq)]
pub struct NodeValue {
    pub id: i64,
    pub name: String,
    pub value: f64,
}

/// Values produced by one evaluation of a stateless compiled model.
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
            let kind = match node.node_type.as_str() {
                "parameter" => NodeKind::Parameter,
                "algebraic" => NodeKind::Algebraic,
                other => {
                    return Err(EngineError::UnsupportedNodeType {
                        node: node.name.clone(),
                        node_type: other.to_string(),
                    })
                }
            };
            if kind == NodeKind::Parameter && !incoming[index].is_empty() {
                return Err(EngineError::IncomingEdgeToParameter(node.name.clone()));
            }
            let source = node.value_expression.trim();
            if source.is_empty() {
                return Err(EngineError::EmptyExpression(node.name.clone()));
            }
            let expression =
                expression::parse(source).map_err(|message| EngineError::ExpressionSyntax {
                    node: node.name.clone(),
                    message,
                })?;
            let references = expression.references();
            if kind == NodeKind::Parameter {
                if let Some(reference) = references.into_iter().next() {
                    return Err(EngineError::ParameterReference {
                        node: node.name.clone(),
                        reference,
                    });
                }
            } else {
                let predecessor_names = incoming[index]
                    .iter()
                    .map(|predecessor| document.nodes[*predecessor].name.as_str())
                    .collect::<HashSet<_>>();
                for reference in references {
                    if !name_to_index.contains_key(&reference) {
                        return Err(EngineError::UnknownReference {
                            node: node.name.clone(),
                            reference,
                        });
                    }
                    if !predecessor_names.contains(reference.as_str()) {
                        return Err(EngineError::MissingDependencyEdge {
                            node: node.name.clone(),
                            reference,
                        });
                    }
                }
            }
            nodes.push(CompiledNode {
                id: node.id,
                name: node.name.clone(),
                kind,
                expression,
                predecessors: incoming[index].clone(),
            });
        }

        let evaluation_order = build_evaluation_order(&nodes)?;
        Ok(Self {
            nodes,
            evaluation_order,
        })
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn evaluation_order(&self) -> impl Iterator<Item = &str> {
        self.evaluation_order
            .iter()
            .map(|index| self.nodes[*index].name.as_str())
    }

    pub fn evaluate(&self) -> Result<Evaluation, EngineError> {
        let mut computed = HashMap::with_capacity(self.nodes.len());
        let mut values_by_index = vec![None; self.nodes.len()];

        for index in &self.evaluation_order {
            let node = &self.nodes[*index];
            let value =
                node.expression
                    .evaluate(&computed)
                    .map_err(|message| EngineError::Evaluation {
                        node: node.name.clone(),
                        message,
                    })?;
            if !value.is_finite() {
                return Err(EngineError::NonFiniteValue(node.name.clone()));
            }
            computed.insert(node.name.clone(), value);
            values_by_index[*index] = Some(value);
        }

        let values = self
            .nodes
            .iter()
            .enumerate()
            .map(|(index, node)| NodeValue {
                id: node.id,
                name: node.name.clone(),
                value: values_by_index[index]
                    .expect("the compiled evaluation order must include every node"),
            })
            .collect();
        Ok(Evaluation { values })
    }
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
    let mut resolved = order.iter().copied().collect::<HashSet<_>>();
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
