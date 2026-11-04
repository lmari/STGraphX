// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, SimulationSnapshot, Value};

const FIXTURE: &str = include_str!("fixtures/set-at.json");

fn assert_tensor(value: Option<&Value>, shape: &[usize], elements: &[f64]) {
    let tensor = value
        .and_then(Value::as_tensor)
        .expect("value should be a tensor");
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

fn assert_common_values(snapshot: &SimulationSnapshot) {
    assert_tensor(
        snapshot.value("updatedVector"),
        &[3],
        &[1.0, 9.0, 3.0],
    );
    assert_tensor(
        snapshot.value("updatedCell"),
        &[2, 2],
        &[1.0, 2.0, 8.0, 4.0],
    );
    assert_tensor(
        snapshot.value("updatedRow"),
        &[2, 2],
        &[7.0, 6.0, 3.0, 4.0],
    );
    assert_tensor(
        snapshot.value("localUpdate"),
        &[3],
        &[4.0, 0.0, 6.0],
    );
    assert_tensor(
        snapshot.value("infected"),
        &[3, 3],
        &[0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    );
}

#[test]
fn set_at_matches_vector_matrix_and_state_reference_results() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let simulation = model.simulate().expect("fixture should simulate");
    assert_eq!(simulation.snapshots().len(), 3);

    let expected_counters = [
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [1.0, 1.0, 0.0],
    ];
    for (snapshot, expected_counter) in simulation.snapshots().iter().zip(expected_counters) {
        assert_common_values(snapshot);
        assert_tensor(snapshot.value("counter"), &[3], &expected_counter);
    }
}
