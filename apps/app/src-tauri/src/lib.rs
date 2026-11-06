#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // fs antes do dialog: o caminho escolhido no diálogo entra no escopo do fs (T03-07).
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
