/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

use stgraphx_engine::{compile_json, Value};

const FIXTURE: &str = include_str!("fixtures/logarithms.json");

#[test]
fn evaluates_natural_and_based_logarithms() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_eq!(evaluation.scalar("natural"), Some(1.0));
    assert_eq!(evaluation.scalar("binary"), Some(3.0));
    let vector = evaluation
        .value("vector")
        .and_then(Value::as_tensor)
        .expect("vector logarithm should be a tensor");
    assert_eq!(vector.shape(), &[3]);
    assert_eq!(vector.elements(), &[0.0, 1.0, 2.0]);
}
