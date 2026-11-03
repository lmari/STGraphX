// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, Evaluation};

const FIXTURE: &str = include_str!("fixtures/conditional-functions.json");

fn assert_tensor(evaluation: &Evaluation, name: &str, shape: &[usize], elements: &[f64]) {
    let tensor = evaluation
        .value(name)
        .and_then(|value| value.as_tensor())
        .unwrap_or_else(|| panic!("'{name}' should be a tensor"));
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

#[test]
fn evaluates_vectorized_conditions_and_first_built_in_functions() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_tensor(&evaluation, "absolute", &[3], &[2.0, 4.0, 8.0]);
    assert_tensor(&evaluation, "mask", &[3], &[0.0, 0.0, 1.0]);
    assert_eq!(evaluation.scalar("total"), Some(14.0));
    assert_tensor(&evaluation, "rowMeans", &[2], &[1.5, 3.5]);
    assert_tensor(&evaluation, "dimensions", &[2], &[2.0, 2.0]);
    assert_tensor(&evaluation, "clipped", &[3], &[0.0, 4.0, 0.0]);
    assert_tensor(&evaluation, "roots", &[3], &[1.0, 2.0, 3.0]);
    assert_tensor(&evaluation, "columnTotals", &[2], &[4.0, 6.0]);
    assert_tensor(&evaluation, "nonZeroByColumn", &[2], &[1.0, 1.0]);
}
