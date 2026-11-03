// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

#![forbid(unsafe_code)]
#![doc = "WebAssembly bridge for the platform-independent STGraphX engine."]

use serde_json::{json, Map, Value as JsonValue};
use stgraphx_engine::{compile_json, engine_info, Evaluation, Tensor, Value};
use wasm_bindgen::prelude::*;

fn tensor_axis_json(tensor: &Tensor, dimension: usize, element_index: &mut usize) -> JsonValue {
    let mut values = Vec::with_capacity(tensor.shape()[dimension]);
    for _ in 0..tensor.shape()[dimension] {
        if dimension + 1 == tensor.shape().len() {
            values.push(json!(tensor.elements()[*element_index]));
            *element_index += 1;
        } else {
            values.push(tensor_axis_json(tensor, dimension + 1, element_index));
        }
    }
    JsonValue::Array(values)
}

fn value_json(value: &Value) -> JsonValue {
    match value {
        Value::Scalar(number) => json!(number),
        Value::Tensor(tensor) => {
            let mut element_index = 0;
            tensor_axis_json(tensor, 0, &mut element_index)
        }
    }
}

fn evaluation_json(evaluation: &Evaluation) -> JsonValue {
    let values = evaluation
        .values()
        .iter()
        .map(|node| (node.name.clone(), value_json(&node.value)))
        .collect::<Map<_, _>>();
    JsonValue::Object(values)
}

fn engine_info_value() -> JsonValue {
    let info = engine_info();
    json!({
        "name": info.name,
        "version": info.version,
        "apiVersion": info.api_version,
        "capabilities": info.capabilities,
    })
}

fn execute_model(source: &str) -> Result<String, String> {
    let model = compile_json(source).map_err(|error| error.to_string())?;
    let snapshots = if model.has_state_nodes() {
        model
            .simulate()
            .map_err(|error| error.to_string())?
            .snapshots()
            .iter()
            .map(|snapshot| {
                json!({
                    "time": snapshot.time(),
                    "values": evaluation_json(snapshot.evaluation()),
                })
            })
            .collect::<Vec<_>>()
    } else {
        let evaluation = model.evaluate().map_err(|error| error.to_string())?;
        vec![json!({
            "time": model.execution().t0,
            "values": evaluation_json(&evaluation),
        })]
    };

    serde_json::to_string(&json!({
        "schemaVersion": 1,
        "engine": engine_info_value(),
        "nodeCount": model.node_count(),
        "snapshots": snapshots,
    }))
    .map_err(|error| format!("cannot serialize execution result: {error}"))
}

/// Returns engine identity and capabilities as a JSON object.
#[wasm_bindgen(js_name = engineInfoJson)]
pub fn engine_info_json() -> String {
    engine_info_value().to_string()
}

/// Compiles and executes one complete model, returning every snapshot as JSON.
#[wasm_bindgen(js_name = executeModelJson)]
pub fn execute_model_json(source: &str) -> Result<String, JsValue> {
    execute_model(source).map_err(|message| JsValue::from_str(&message))
}

#[cfg(test)]
mod tests {
    use super::*;

    const RK4_FIXTURE: &str = include_str!("../../stgraphx-engine/tests/fixtures/rk4-state.json");

    #[test]
    fn serializes_scalar_and_tensor_snapshots_for_javascript() {
        let result = execute_model(RK4_FIXTURE).expect("fixture should execute");
        let payload: JsonValue = serde_json::from_str(&result).expect("result should be JSON");

        assert_eq!(payload["schemaVersion"], 1);
        assert_eq!(payload["engine"]["apiVersion"], 1);
        assert_eq!(payload["snapshots"].as_array().map(Vec::len), Some(11));
        assert_eq!(payload["snapshots"][0]["values"]["decay"], 1.0);
        assert_eq!(
            payload["snapshots"][0]["values"]["vectorDecay"],
            json!([1.0, 2.0])
        );
    }

    #[test]
    fn returns_one_snapshot_for_a_model_without_state_nodes() {
        let source = r#"{
            "version": 1,
            "execution": {"t0": 3},
            "nodes": [
                {"id": 1, "name": "answer", "type": "parameter", "valueExpression": "42"}
            ]
        }"#;
        let result = execute_model(source).expect("model should execute");
        let payload: JsonValue = serde_json::from_str(&result).expect("result should be JSON");

        assert_eq!(payload["snapshots"].as_array().map(Vec::len), Some(1));
        assert_eq!(payload["snapshots"][0]["time"], 3.0);
        assert_eq!(payload["snapshots"][0]["values"]["answer"], 42.0);
    }
}
