// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, SimulationSnapshot, Value};

const FIXTURE: &str = include_str!("fixtures/array-iterations.json");

fn assert_scalar(snapshot: &SimulationSnapshot, name: &str, expected: f64) {
    assert_eq!(
        snapshot.value(name).and_then(Value::as_scalar),
        Some(expected),
        "unexpected value for {name}"
    );
}

fn assert_tensor(
    snapshot: &SimulationSnapshot,
    name: &str,
    shape: &[usize],
    elements: &[f64],
) {
    let tensor = snapshot
        .value(name)
        .and_then(Value::as_tensor)
        .unwrap_or_else(|| panic!("{name} should be a tensor"));
    assert_eq!(tensor.shape(), shape, "unexpected shape for {name}");
    assert_eq!(tensor.elements(), elements, "unexpected values for {name}");
}

#[test]
fn array_iterations_match_javascript_reference_results() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let simulation = model.simulate().expect("fixture should simulate");
    assert_eq!(simulation.snapshots().len(), 3);

    let expected_states = [
        [1.0, 2.0, 3.0],
        [2.0, 4.0, 6.0],
        [3.0, 6.0, 9.0],
    ];
    for (snapshot, expected_state) in simulation.snapshots().iter().zip(expected_states) {
        assert_tensor(snapshot, "mappedVector", &[4], &[-4.0, 1.0, 8.0, 11.0]);
        assert_tensor(
            snapshot,
            "mappedMatrix",
            &[2, 2],
            &[1.0, 3.0, 13.0, 15.0],
        );
        assert_tensor(snapshot, "filteredVector", &[2], &[3.0, 4.0]);
        assert_tensor(snapshot, "filteredMatrix", &[2, 1], &[2.0, 4.0]);
        assert_tensor(snapshot, "flattened", &[4], &[1.0, 2.0, 3.0, 4.0]);
        assert_scalar(snapshot, "positiveCount", 2.0);
        assert_tensor(snapshot, "columnCounts", &[2], &[1.0, 1.0]);
        assert_tensor(snapshot, "positiveIndices", &[2], &[2.0, 3.0]);
        assert_tensor(
            snapshot,
            "matrixIndices",
            &[2, 2],
            &[1.0, 0.0, 1.0, 1.0],
        );
        assert_tensor(snapshot, "pureIndices", &[2], &[1.0, 3.0]);
        assert_tensor(snapshot, "mappedState", &[3], &expected_state);
    }
}
