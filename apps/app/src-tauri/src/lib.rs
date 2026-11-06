use tauri::{AppHandle, Manager};

/// Traz a janela principal para a frente (deep link de redefinição de senha, T03-08).
fn mostrar_janela(app: &AppHandle) {
  if let Some(janela) = app.get_webview_window("main") {
    let _ = janela.unminimize();
    let _ = janela.show();
    let _ = janela.set_focus();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();

  // Windows e Linux abrem o link numa segunda instância: ela repassa a URL à primeira e fecha.
  // Precisa ser o primeiro plugin.
  #[cfg(any(windows, target_os = "linux"))]
  let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
    mostrar_janela(app);
  }));

  builder
    .plugin(tauri_plugin_deep_link::init())
    // fs antes do dialog: o caminho escolhido no diálogo entra no escopo do fs (T03-07).
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      use tauri_plugin_deep_link::DeepLinkExt;
      // No desenvolvimento (Windows e Linux), registra o esquema sem instalar o app.
      #[cfg(all(debug_assertions, any(windows, target_os = "linux")))]
      app.deep_link().register_all()?;
      let handle = app.handle().clone();
      app.deep_link().on_open_url(move |_| mostrar_janela(&handle));
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
