// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, Evaluation, Value};

const FIXTURE: &str = include_str!("fixtures/range-sequences.json");
const BIFURCATIONS: &str = include_str!("../../../examples/biforcazioni.json");
const SUPPLY_DEMAND: &str = include_str!("../../../examples/domanda-offerta.json");

fn assert_tensor(evaluation: &Evaluation, name: &str, shape: &[usize], elements: &[f64]) {
    let tensor = evaluation
        .value(name)
        .and_then(Value::as_tensor)
        .unwrap_or_else(|| panic!("'{name}' should be a tensor"));
    assert_eq!(tensor.shape(), shape);
    assert_eq!(tensor.elements(), elements);
}

#[test]
fn evaluates_increasing_decreasing_and_fractional_ranges() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    let evaluation = model.evaluate().expect("fixture should evaluate");

    assert_tensor(
        &evaluation,
        "singleArgument",
        &[4],
        &[0.0, 1.0, 2.0, 3.0],
    );
    assert_tensor(
        &evaluation,
        "ascending",
        &[5],
        &[1.0, 2.0, 3.0, 4.0, 5.0],
    );
    assert_tensor(&evaluation, "descending", &[3], &[3.0, 2.0, 1.0]);
    assert_tensor(
        &evaluation,
        "fractional",
        &[4],
        &[0.0, 0.1, 0.2, 0.3],
    );
    assert_tensor(
        &evaluation,
        "valueAndIndex",
        &[5, 2],
        &[-2.0, 0.0, -1.0, 1.0, 0.0, 2.0, 1.0, 3.0, 2.0, 4.0],
    );
}

#[test]
fn range_enables_bifurcation_and_supply_demand_examples() {
    let bifurcations = compile_json(BIFURCATIONS).expect("bifurcations should compile");
    let bifurcations = bifurcations
        .evaluate()
        .expect("bifurcations should evaluate at t0");
    let k = bifurcations
        .value("k")
        .and_then(Value::as_tensor)
        .expect("k should be a vector");
    assert_eq!(k.shape(), &[1400]);
    assert_eq!(k.elements().first(), Some(&1.6));
    assert_eq!(k.elements().last(), Some(&2.999));

    let supply_demand = compile_json(SUPPLY_DEMAND).expect("supply-demand should compile");
    let supply_demand = supply_demand
        .evaluate()
        .expect("supply-demand should evaluate at t0");
    let demand = supply_demand
        .value("domanda")
        .and_then(Value::as_tensor)
        .expect("domanda should be a vector");
    let price = supply_demand
        .value("prezzo_2")
        .and_then(Value::as_tensor)
        .expect("prezzo_2 should be a vector");
    assert_eq!(demand.shape(), &[20]);
    assert_eq!(price.shape(), &[10]);
}
