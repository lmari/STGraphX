// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::engine_info;
use stgraphx_engine::compile_json;

fn run() -> Result<(), String> {
    let mut arguments = std::env::args().skip(1);
    let Some(path) = arguments.next() else {
        let info = engine_info();
        println!("{} {}", info.name, info.version);
        println!("usage: stgraphx-cli <model.json>");
        return Ok(());
    };
    if arguments.next().is_some() {
        return Err("expected exactly one model path".to_string());
    }

    let source = std::fs::read_to_string(&path)
        .map_err(|error| format!("cannot read '{path}': {error}"))?;
    let model = compile_json(&source).map_err(|error| error.to_string())?;
    let evaluation = model.evaluate().map_err(|error| error.to_string())?;

    for node in evaluation.values() {
        println!("{}={}", node.name, node.value);
    }
    Ok(())
}

fn main() {
    if let Err(message) = run() {
        eprintln!("error: {message}");
        std::process::exit(1);
    }
}
