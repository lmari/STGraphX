// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use stgraphx_engine::engine_info;

fn main() {
    let info = engine_info();
    let capabilities = if info.capabilities.is_empty() {
        "none".to_string()
    } else {
        info.capabilities.join(", ")
    };

    println!(
        "{} {} (API {}, capabilities: {})",
        info.name, info.version, info.api_version, capabilities
    );
}
