// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, Evaluation};

const FIXTURE: &str = include_str!("fixtures/tensor-indexing.json");

fn assert_tensor(evaluation: &Evaluation, name: &str, shape: &[usize], elements: &[f64]) {
    let tensor = evaluation
        .value(name)
        .and_then(|value| value.as_tensor())
        .unwrap_or_else(|| panic!("'{name}' should be a tensor"));
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

#[test]
fn evaluates_scalar_vector_matrix_and_advanced_indices() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_eq!(evaluation.scalar("second"), Some(20.0));
    assert_eq!(evaluation.scalar("last"), Some(40.0));
    assert_tensor(&evaluation, "strideSlice", &[2], &[20.0, 40.0]);
    assert_tensor(&evaluation, "reversed", &[4], &[40.0, 30.0, 20.0, 10.0]);
    assert_tensor(&evaluation, "middleRow", &[3], &[4.0, 5.0, 6.0]);
    assert_eq!(evaluation.scalar("cell"), Some(6.0));
    assert_tensor(&evaluation, "middleColumn", &[3], &[2.0, 5.0, 8.0]);
    assert_tensor(&evaluation, "block", &[2, 2], &[2.0, 3.0, 5.0, 6.0]);
    assert_tensor(
        &evaluation,
        "selectedRows",
        &[2, 3],
        &[1.0, 2.0, 3.0, 7.0, 8.0, 9.0],
    );
    assert_tensor(
        &evaluation,
        "selectedColumns",
        &[3, 2],
        &[1.0, 3.0, 4.0, 6.0, 7.0, 9.0],
    );
    assert_tensor(&evaluation, "coordinateCells", &[2], &[2.0, 7.0]);
    assert_eq!(evaluation.scalar("dynamicCell"), Some(5.0));
    assert_eq!(evaluation.scalar("chainedCell"), Some(7.0));
}
