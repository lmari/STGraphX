// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::fs;
use std::path::Path;

fn dialog_with_title(title: &str) -> rfd::FileDialog {
    let dialog = rfd::FileDialog::new().add_filter("JSON", &["json"]);
    if title.trim().is_empty() {
        dialog
    } else {
        dialog.set_title(title)
    }
}

#[tauri::command]
fn get_startup_language() -> String {
    std::env::var("STGRAPHX_LANG").unwrap_or_default()
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn ensure_file_exists(path: String) -> Result<(), String> {
    if Path::new(&path).is_file() {
        Ok(())
    } else {
        Err(format!("File not found: {path}"))
    }
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn open_file_dialog(multiple: bool, title: String) -> Vec<String> {
    let dialog = dialog_with_title(&title);
    if multiple {
        return dialog
            .pick_files()
            .unwrap_or_default()
            .into_iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect();
    }
    dialog
        .pick_file()
        .map(|path| vec![path.to_string_lossy().into_owned()])
        .unwrap_or_default()
}

#[tauri::command]
fn save_file_dialog(suggested_name: String, title: String) -> Option<String> {
    dialog_with_title(&title)
        .set_file_name(&suggested_name)
        .save_file()
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn open_directory_dialog(title: String) -> Option<String> {
    let dialog = rfd::FileDialog::new();
    let dialog = if title.trim().is_empty() {
        dialog
    } else {
        dialog.set_title(title)
    };
    dialog.pick_folder().map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn read_clipboard_text() -> Result<String, String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|error| error.to_string())?;
    clipboard.get_text().map_err(|error| error.to_string())
}

#[tauri::command]
fn write_clipboard_text(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|error| error.to_string())?;
    clipboard.set_text(text).map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_startup_language,
            read_text_file,
            ensure_file_exists,
            write_text_file,
            open_file_dialog,
            save_file_dialog,
            open_directory_dialog,
            read_clipboard_text,
            write_clipboard_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running STGraphX Tauri application");
}
