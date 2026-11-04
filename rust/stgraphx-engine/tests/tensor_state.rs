// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, SimulationSnapshot};

const FIXTURE: &str = include_str!("fixtures/tensor-state-euler.json");

fn assert_tensor(snapshot: &SimulationSnapshot, name: &str, shape: &[usize], elements: &[f64]) {
    let tensor = snapshot
        .value(name)
        .and_then(|value| value.as_tensor())
        .unwrap_or_else(|| panic!("'{name}' should be a tensor"));
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

#[test]
fn simulates_vector_and_matrix_state_nodes() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let simulation = model.simulate().expect("fixture should simulate");
    let snapshots = simulation.snapshots();

    assert_eq!(snapshots.len(), 3);

    assert_tensor(&snapshots[0], "position", &[2], &[0.0, 1.0]);
    assert_tensor(&snapshots[0], "shifted", &[2], &[10.0, 22.0]);
    assert_tensor(&snapshots[0], "lattice", &[2, 2], &[1.0, 2.0, 3.0, 4.0]);

    assert_tensor(&snapshots[1], "position", &[2], &[1.0, 0.5]);
    assert_tensor(&snapshots[1], "shifted", &[2], &[12.0, 21.0]);
    assert_tensor(&snapshots[1], "lattice", &[2, 2], &[2.0, 3.0, 4.0, 5.0]);

    assert_tensor(&snapshots[2], "position", &[2], &[2.0, 0.0]);
    assert_tensor(&snapshots[2], "shifted", &[2], &[14.0, 20.0]);
    assert_tensor(&snapshots[2], "lattice", &[2, 2], &[3.0, 4.0, 5.0, 6.0]);
}
