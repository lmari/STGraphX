// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, Evaluation, Value};

const FIXTURE: &str = include_str!("fixtures/generated-arrays.json");
const BOUNDED_OSCILLATOR: &str = include_str!("../../../examples/bounded oscillator.json");

fn assert_tensor(value: Option<&Value>, shape: &[usize], elements: &[f64]) {
    let tensor = value
        .and_then(Value::as_tensor)
        .expect("value should be a tensor");
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

fn assert_tensor_close(value: Option<&Value>, shape: &[usize], elements: &[f64], tolerance: f64) {
    let tensor = value
        .and_then(Value::as_tensor)
        .expect("value should be a tensor");
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements().len(), elements.len());
    for (actual, expected) in tensor.elements().iter().zip(elements) {
        assert!((actual - expected).abs() <= tolerance);
    }
}

fn assert_evaluation_tensor(
    evaluation: &Evaluation,
    name: &str,
    shape: &[usize],
    elements: &[f64],
) {
    assert_tensor(evaluation.value(name), shape, elements);
}

#[test]
fn evaluates_generated_arrays_append_and_global_parameters() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_evaluation_tensor(&evaluation, "indices", &[3], &[0.0, 1.0, 2.0]);
    assert_evaluation_tensor(&evaluation, "selected", &[2], &[2.0, 5.0]);
    assert_evaluation_tensor(&evaluation, "generatedGrid", &[2, 2], &[2.0, 5.0, 4.0, 7.0]);
    assert_evaluation_tensor(&evaluation, "joined", &[5], &[-1.0, 0.0, 1.0, 2.0, 3.0]);
    assert_evaluation_tensor(
        &evaluation,
        "rows",
        &[3, 2],
        &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
    );
    assert_evaluation_tensor(
        &evaluation,
        "columns",
        &[2, 3],
        &[1.0, 2.0, 5.0, 3.0, 4.0, 6.0],
    );
    assert_evaluation_tensor(&evaluation, "position", &[3], &[0.0, 0.0, 0.0]);

    let simulation = model.simulate().expect("fixture should simulate");
    let final_snapshot = simulation
        .final_snapshot()
        .expect("simulation should produce snapshots");
    assert_tensor(final_snapshot.value("position"), &[3], &[0.5, 0.5, 0.5]);
}

#[test]
fn bounded_oscillator_example_compiles_and_evaluates() {
    let model = compile_json(BOUNDED_OSCILLATOR).expect("bounded oscillator should compile");
    let evaluation = model
        .evaluate()
        .expect("bounded oscillator should evaluate at t0");

    assert_evaluation_tensor(&evaluation, "p", &[2], &[0.1, 0.29]);
    assert_evaluation_tensor(&evaluation, "v", &[2], &[0.0, 0.0]);
    assert_tensor_close(evaluation.value("d"), &[3], &[0.1, 0.19, 0.71], 1e-14);

    let acceleration = evaluation
        .value("a")
        .and_then(Value::as_tensor)
        .expect("acceleration should be a vector");
    let expected = [
        0.02 * (1.0 / 0.1_f64.powi(2) - 1.0 / 0.19_f64.powi(2)),
        0.02 * (1.0 / 0.19_f64.powi(2) - 1.0 / 0.71_f64.powi(2)),
    ];
    assert_eq!(acceleration.shape(), &[2]);
    for (actual, expected) in acceleration.elements().iter().zip(expected) {
        assert!((actual - expected).abs() < 1e-12);
    }
}
