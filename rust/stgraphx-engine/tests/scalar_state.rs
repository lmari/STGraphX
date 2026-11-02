// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::compile_json;

const FIXTURE: &str = include_str!("fixtures/scalar-state-euler.json");

#[test]
fn simulates_scalar_state_nodes_with_euler_and_direct_transitions() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let simulation = model.simulate().expect("fixture should simulate");

    assert!(model.has_state_nodes());
    assert_eq!(simulation.snapshots().len(), 4);

    let expected = [
        (0.0, 1.0, 10.0, 11.0),
        (0.5, 2.0, 11.0, 13.5),
        (1.0, 3.0, 12.0, 16.0),
        (1.5, 4.0, 13.0, 18.5),
    ];
    for (snapshot, (time, stock, counter, observed)) in
        simulation.snapshots().iter().zip(expected)
    {
        assert_eq!(snapshot.time(), time);
        assert_eq!(snapshot.value("stock"), Some(stock));
        assert_eq!(snapshot.value("counter"), Some(counter));
        assert_eq!(snapshot.value("observed"), Some(observed));
    }
}

#[test]
fn state_values_break_instantaneous_feedback_cycles() {
    let source = r#"
    {
      "version": 1,
      "execution": { "t0": 0, "dt": 1, "t1": 2, "integrator": "euler" },
      "nodes": [
        {
          "id": 1,
          "name": "stock",
          "type": "state",
          "initialState": "1",
          "stateTransition": "this+flow"
        },
        { "id": 2, "name": "flow", "type": "algebraic", "valueExpression": "stock*2" }
      ],
      "edges": [
        { "id": 1, "from": 1, "to": 2 },
        { "id": 2, "from": 2, "to": 1 }
      ]
    }
    "#;

    let model = compile_json(source).expect("a state node should break the feedback cycle");
    let simulation = model.simulate().expect("model should simulate");
    let values = simulation
        .snapshots()
        .iter()
        .map(|snapshot| snapshot.value("stock"))
        .collect::<Vec<_>>();

    assert_eq!(values, vec![Some(1.0), Some(3.0), Some(9.0)]);
}
