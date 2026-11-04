// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::{compile_json, EngineError, Value};

const FIXTURE: &str = include_str!("fixtures/seeded-random.json");

fn assert_tensor(value: Option<&Value>, expected: &[f64]) {
    let tensor = value
        .and_then(Value::as_tensor)
        .expect("value should be a tensor");
    assert_eq!(tensor.shape(), &[expected.len()]);
    assert_eq!(tensor.elements(), expected);
}

#[test]
fn seeded_random_sequence_matches_the_javascript_reference() {
    let model = compile_json(FIXTURE).expect("fixture should compile");
    assert_eq!(model.execution().random_seed, Some(123_456_789));

    let simulation = model.simulate().expect("fixture should simulate");
    assert_eq!(simulation.snapshots().len(), 3);

    let expected = [
        (
            0.0,
            [
                0.082_684_674_998_745_32,
                0.807_323_461_631_313,
                1.829_504_579_072_818_2,
            ],
            0.0,
            15.674_888_768_699_02,
            0.177_080_682_711_675_76,
            1.0,
        ),
        (
            1.0,
            [
                4.089_529_894_990_846_5,
                2.977_187_327_342_108,
                2.101_490_336_935_967,
            ],
            1.0,
            18.380_719_097_331_166,
            0.052_831_611_130_386_59,
            0.0,
        ),
        (
            2.0,
            [
                3.740_159_877_343_103_3,
                2.124_269_115_738_570_7,
                2.365_656_654_583_29,
            ],
            1.0,
            12.888_905_527_070_165,
            0.568_163_660_820_573_6,
            -1.0,
        ),
    ];

    for (snapshot, (time, vector, integer, local, lazy, walk)) in
        simulation.snapshots().iter().zip(expected)
    {
        assert_eq!(snapshot.time(), time);
        assert_eq!(
            snapshot.scalar("fixedRandom"),
            Some(0.257_790_743_838_995_7)
        );
        assert_tensor(snapshot.value("randomVector"), &vector);
        assert_eq!(snapshot.scalar("randomInteger"), Some(integer));
        assert_eq!(snapshot.scalar("localSample"), Some(local));
        assert_eq!(snapshot.scalar("lazySample"), Some(lazy));
        assert_eq!(snapshot.scalar("walk"), Some(walk));
    }

    assert_eq!(
        model.simulate().expect("a repeated run should simulate"),
        simulation,
        "each complete run must reset the seeded generator"
    );
}

#[test]
fn core_reports_when_randomness_has_no_caller_supplied_seed() {
    let source = r#"{
      "version": 1,
      "nodes": [
        {"id": 1, "name": "sample", "type": "parameter", "valueExpression": "rand()"}
      ]
    }"#;
    let model = compile_json(source).expect("model should compile");
    let error = model
        .evaluate()
        .expect_err("the platform boundary must supply a seed");

    assert_eq!(
        error,
        EngineError::Evaluation {
            node: "sample".to_string(),
            message: "random functions require execution.randomSeed".to_string(),
        }
    );
}

#[test]
fn seed_is_normalized_with_javascript_uint32_rules() {
    let source = r#"{
      "version": 1,
      "execution": {"randomSeed": -1},
      "nodes": [
        {"id": 1, "name": "sample", "type": "parameter", "valueExpression": "rand()"}
      ]
    }"#;
    let model = compile_json(source).expect("model should compile");

    assert_eq!(model.execution().random_seed, Some(u32::MAX));
    model.evaluate().expect("normalized seed should execute");
}
