use std::process::Command;
use std::path::PathBuf;

pub async fn execute_python(script: String, args: Vec<String>) -> Result<String, String> {
    let app_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    
    let poppler_path = app_dir.join("poppler");
    let tesseract_path = app_dir.join("tesseract");
    let tessdata_path = tesseract_path.join("tessdata");
    
    let python_cmd = if cfg!(target_os = "windows") {
        if Command::new("py").arg("--version").output().is_ok() {
            "py"
        } else if Command::new("python").arg("--version").output().is_ok() {
            "python"
        } else {
            return Err("Python not found. Please install Python from python.org".to_string());
        }
    } else {
        "python3"
    };
    
    let (command, script_path) = if cfg!(debug_assertions) {
        let path = PathBuf::from("..").join("python-scripts").join(&script);
        (python_cmd.to_string(), path)
    } else {
        let exe_name = script.replace(".py", "");
        let exe_path = if cfg!(target_os = "windows") {
            app_dir.join(format!("{}.exe", exe_name))
        } else {
            app_dir.join(&exe_name)
        };
        (exe_path.to_string_lossy().to_string(), PathBuf::new())
    };
    
    let mut cmd = if cfg!(debug_assertions) {
        let mut c = Command::new(command);
        c.arg(script_path);
        c
    } else {
        Command::new(command)
    };
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = if cfg!(target_os = "windows") {
        format!("{};{};{}", 
            poppler_path.to_string_lossy(),
            tesseract_path.to_string_lossy(),
            current_path
        )
    } else {
        format!("{}:{}:{}", 
            poppler_path.to_string_lossy(),
            tesseract_path.to_string_lossy(),
            current_path
        )
    };
    
    cmd.env("PATH", new_path);
    cmd.env("TESSDATA_PREFIX", tessdata_path.to_string_lossy().to_string());
    cmd.args(args);
    
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
