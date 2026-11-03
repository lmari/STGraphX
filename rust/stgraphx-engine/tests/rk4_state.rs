// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, EngineError};

const FIXTURE: &str = include_str!("fixtures/rk4-state.json");

fn assert_close(actual: f64, expected: f64, tolerance: f64) {
    assert!(
        (actual - expected).abs() <= tolerance,
        "expected {expected}, found {actual}"
    );
}

#[test]
fn rk4_integrates_coupled_scalar_and_tensor_states() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let simulation = model.simulate().expect("fixture should simulate");

    assert_eq!(simulation.snapshots().len(), 11);
    let final_snapshot = simulation
        .final_snapshot()
        .expect("simulation should contain snapshots");
    assert_close(final_snapshot.time(), 1.0, 1e-12);
    assert_close(
        final_snapshot.scalar("decay").expect("decay should be scalar"),
        (-1.0_f64).exp(),
        1e-6,
    );
    let vector = final_snapshot
        .value("vectorDecay")
        .and_then(|value| value.as_tensor())
        .expect("vectorDecay should be a tensor");
    assert_eq!(vector.shape(), &[2]);
    assert_close(vector.elements()[0], (-1.0_f64).exp(), 1e-6);
    assert_close(vector.elements()[1], 2.0 * (-1.0_f64).exp(), 2e-6);
    assert_close(
        final_snapshot
            .scalar("position")
            .expect("position should be scalar"),
        1.0_f64.cos(),
        1e-6,
    );
    assert_close(
        final_snapshot
            .scalar("velocity")
            .expect("velocity should be scalar"),
        -1.0_f64.sin(),
        1e-6,
    );
    assert_eq!(final_snapshot.scalar("counter"), Some(10.0));
    assert_close(
        final_snapshot
            .scalar("timeIntegral")
            .expect("timeIntegral should be scalar"),
        0.5,
        1e-12,
    );
}

#[test]
fn mixed_integral_transitions_are_explicitly_rejected_for_now() {
    let source = r#"{
        "version": 1,
        "execution": {"t0":0,"dt":0.1,"t1":1,"integrator":"rk4"},
        "nodes": [
            {
                "id":1,
                "name":"stateValue",
                "type":"state",
                "initialState":"1",
                "stateTransition":"integral(-this)+0"
            }
        ]
    }"#;

    assert_eq!(
        compile_json(source).expect_err("mixed RK4 transition should fail"),
        EngineError::UnsupportedRk4Transition("stateValue".to_string())
    );
}
