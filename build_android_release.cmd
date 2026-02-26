@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT_ROOT=%~dp0"
set "ANDROID_DIR=%PROJECT_ROOT%android"
set "ARTIFACTS_DIR=%PROJECT_ROOT%artifacts\android"

if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined ANDROID_SDK_ROOT set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

if not exist "%ANDROID_DIR%\keystore.properties" (
    echo [ERROR] Missing android\keystore.properties
    echo         Copy android\keystore.properties.example then fill real signing secrets.
    exit /b 1
)

if not exist "%ANDROID_HOME%\build-tools" (
    echo [ERROR] Android build-tools not found at "%ANDROID_HOME%\build-tools"
    exit /b 1
)

for /f "delims=" %%I in ('dir /b /ad "%ANDROID_HOME%\build-tools" ^| sort /r') do (
    set "BUILD_TOOLS_VERSION=%%I"
    goto :build_tools_found
)

:build_tools_found
if not defined BUILD_TOOLS_VERSION (
    echo [ERROR] Could not detect Android build-tools version.
    exit /b 1
)

set "ZIPALIGN_EXE=%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\zipalign.exe"
if not exist "%ZIPALIGN_EXE%" set "ZIPALIGN_EXE=%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\zipalign"
set "APKSIGNER_EXE=%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\apksigner.bat"
if not exist "%APKSIGNER_EXE%" set "APKSIGNER_EXE=%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\apksigner"
if not exist "%ZIPALIGN_EXE%" (
    echo [ERROR] zipalign not found in Android build-tools.
    exit /b 1
)
if not exist "%APKSIGNER_EXE%" (
    echo [ERROR] apksigner not found in Android build-tools.
    exit /b 1
)

echo [1/5] Building web assets...
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo [2/5] Syncing Capacitor Android project...
call npx cap sync android
if errorlevel 1 exit /b %errorlevel%

pushd "%ANDROID_DIR%"
if errorlevel 1 exit /b %errorlevel%

for /f "tokens=1,2 delims==" %%A in ('findstr /R /C:"^APP_VERSION_NAME=" gradle.properties') do set "APP_VERSION_NAME=%%B"
for /f "tokens=1,2 delims==" %%A in ('findstr /R /C:"^APP_VERSION_CODE=" gradle.properties') do set "APP_VERSION_CODE=%%B"
if not defined APP_VERSION_NAME set "APP_VERSION_NAME=0.0.0"
if not defined APP_VERSION_CODE set "APP_VERSION_CODE=0"

echo [3/5] Building signed prodRelease APK + AAB...
call gradlew.bat --no-daemon clean assembleProdRelease bundleProdRelease app:sizeReport --console=plain
if errorlevel 1 (
    popd
    exit /b %errorlevel%
)

set "APK_DIR=%ANDROID_DIR%\app\build\outputs\apk\prod\release"
set "AAB_DIR=%ANDROID_DIR%\app\build\outputs\bundle\prodRelease"
set "SIZE_REPORT=%ANDROID_DIR%\build\reports\release\artifact-size-report.txt"

echo [4/5] Verifying zipalign and signature...
for %%F in ("%APK_DIR%\*.apk") do (
    if exist "%%~fF" (
        echo     - %%~nxF
        "%ZIPALIGN_EXE%" -c -v 4 "%%~fF"
        if errorlevel 1 (
            popd
            exit /b %errorlevel%
        )
        call "%APKSIGNER_EXE%" verify --verbose "%%~fF"
        if errorlevel 1 (
            popd
            exit /b %errorlevel%
        )
    )
)

for /f %%I in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyyyMMdd-HHmmss\")"') do set "BUILD_STAMP=%%I"
if not exist "%ARTIFACTS_DIR%" mkdir "%ARTIFACTS_DIR%"

echo [5/5] Exporting named artifacts...
for %%F in ("%APK_DIR%\*.apk") do (
    if exist "%%~fF" (
        set "APK_NAME=code-agent-prod-release-v%APP_VERSION_NAME%(%APP_VERSION_CODE%)-%BUILD_STAMP%-%%~nF%%~xF"
        copy /Y "%%~fF" "%ARTIFACTS_DIR%\!APK_NAME!" >nul
    )
)
for %%F in ("%AAB_DIR%\*.aab") do (
    if exist "%%~fF" (
        set "AAB_NAME=code-agent-prod-release-v%APP_VERSION_NAME%(%APP_VERSION_CODE%)-%BUILD_STAMP%-%%~nF%%~xF"
        copy /Y "%%~fF" "%ARTIFACTS_DIR%\!AAB_NAME!" >nul
    )
)
if exist "%SIZE_REPORT%" copy /Y "%SIZE_REPORT%" "%ARTIFACTS_DIR%\artifact-size-report-%BUILD_STAMP%.txt" >nul

popd
echo [OK] Release artifacts are in: %ARTIFACTS_DIR%
exit /b 0
