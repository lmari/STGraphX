// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, EngineError, Evaluation};

const FIXTURE: &str = include_str!("fixtures/local-functions.json");

fn assert_tensor(evaluation: &Evaluation, name: &str, shape: &[usize], elements: &[f64]) {
    let tensor = evaluation
        .value(name)
        .and_then(|value| value.as_tensor())
        .unwrap_or_else(|| panic!("'{name}' should be a tensor"));
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

#[test]
fn local_functions_accept_and_return_scalar_and_tensor_values() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_eq!(evaluation.scalar("literalResult"), Some(7.0));
    assert_tensor(&evaluation, "transformed", &[3], &[0.0, 0.0, 5.0]);
    assert_eq!(evaluation.scalar("sampleNorm"), Some(13.0));
    assert_eq!(evaluation.scalar("separation"), Some(5.0));
    assert_tensor(&evaluation, "sampleTail", &[2], &[0.0, 3.0]);
    assert_tensor(&evaluation, "shiftedMatrix", &[2, 2], &[3.0, 5.0, 7.0, 9.0]);
    assert_eq!(evaluation.scalar("lastRowNorm"), Some(25.0));
}

#[test]
fn recursive_local_functions_are_rejected_during_compilation() {
    let source = r#"{
        "version": 1,
        "localFunctions": [
            {"name":"first","params":["x"],"expression":"second(x)"},
            {"name":"second","params":["x"],"expression":"first(x)"}
        ],
        "nodes": [
            {"id":1,"name":"value","type":"parameter","valueExpression":"1"}
        ]
    }"#;

    let error = compile_json(source).expect_err("recursive functions should fail");
    assert_eq!(
        error,
        EngineError::LocalFunctionCycle(vec![
            "first".to_string(),
            "second".to_string(),
            "first".to_string(),
        ])
    );
}

#[test]
fn local_function_bodies_cannot_read_model_nodes_implicitly() {
    let source = r#"{
        "version": 1,
        "localFunctions": [
            {"name":"addHidden","params":["x"],"expression":"x+hidden"}
        ],
        "nodes": [
            {"id":1,"name":"hidden","type":"parameter","valueExpression":"2"}
        ]
    }"#;

    let error = compile_json(source).expect_err("implicit node access should fail");
    assert_eq!(
        error,
        EngineError::InvalidLocalFunction {
            name: "addHidden".to_string(),
            message: "unknown reference 'hidden'".to_string(),
        }
    );
}
