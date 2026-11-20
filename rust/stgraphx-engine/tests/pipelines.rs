// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, Evaluation};

const FIXTURE: &str = include_str!("fixtures/pipelines.json");

fn assert_tensor(evaluation: &Evaluation, name: &str, expected: &[f64]) {
    let tensor = evaluation
        .value(name)
        .and_then(|value| value.as_tensor())
        .unwrap_or_else(|| panic!("'{name}' should be a tensor"));
    assert_eq!(tensor.shape(), &[expected.len()]);
    assert_eq!(tensor.elements(), expected);
}

#[test]
fn pipelines_match_the_javascript_reference_semantics() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_eq!(evaluation.scalar("chained"), Some(8.0));
    assert_eq!(evaluation.scalar("selected"), Some(4.0));
    assert_eq!(evaluation.scalar("total"), Some(6.0));
    assert_tensor(&evaluation, "doubled", &[2.0, 4.0, 6.0]);
    assert_tensor(&evaluation, "clipped", &[0.0, 1.0, 3.0]);
    assert_eq!(evaluation.scalar("nested"), Some(13.0));
    assert_eq!(evaluation.scalar("singleRandom"), Some(0.0));
}
