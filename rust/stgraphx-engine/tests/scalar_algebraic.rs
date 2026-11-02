// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, EngineError};

const FIXTURE: &str = include_str!("fixtures/scalar-algebraic.json");

#[test]
fn compiles_and_evaluates_a_scalar_algebraic_model() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_eq!(model.node_count(), 5);
    assert_eq!(
        model.evaluation_order().collect::<Vec<_>>(),
        vec!["a", "b", "total", "result", "precedence"]
    );
    assert_eq!(evaluation.value("a"), Some(2.0));
    assert_eq!(evaluation.value("b"), Some(3.0));
    assert_eq!(evaluation.value("total"), Some(5.0));
    assert_eq!(evaluation.value("result"), Some(24.0));
    assert_eq!(evaluation.value("precedence"), Some(508.0));
}

#[test]
fn reports_a_reference_without_an_incoming_edge() {
    let source = r#"
    {
      "version": 1,
      "nodes": [
        { "id": 1, "name": "a", "type": "parameter", "valueExpression": "2" },
        { "id": 2, "name": "out", "type": "algebraic", "valueExpression": "a+1" }
      ],
      "edges": []
    }
    "#;

    assert_eq!(
        compile_json(source).expect_err("missing edge should fail"),
        EngineError::MissingDependencyEdge {
            node: "out".to_string(),
            reference: "a".to_string(),
        }
    );
}

#[test]
fn reports_an_algebraic_dependency_cycle() {
    let source = r#"
    {
      "version": 1,
      "nodes": [
        { "id": 1, "name": "x", "type": "algebraic", "valueExpression": "y+1" },
        { "id": 2, "name": "y", "type": "algebraic", "valueExpression": "x+1" }
      ],
      "edges": [
        { "id": 1, "from": 2, "to": 1 },
        { "id": 2, "from": 1, "to": 2 }
      ]
    }
    "#;

    assert_eq!(
        compile_json(source).expect_err("cycle should fail"),
        EngineError::DependencyCycle(vec!["x".to_string(), "y".to_string()])
    );
}

#[test]
fn rejects_an_integrator_not_yet_supported_for_state_nodes() {
    let source = r#"
    {
      "version": 1,
      "execution": { "t0": 0, "dt": 1, "t1": 1, "integrator": "rk4" },
      "nodes": [
        {
          "id": 1,
          "name": "state",
          "type": "state",
          "initialState": "1",
          "stateTransition": "this+1"
        }
      ],
      "edges": []
    }
    "#;

    assert_eq!(
        compile_json(source).expect_err("RK4 is not supported yet"),
        EngineError::UnsupportedIntegrator("rk4".to_string())
    );
}
