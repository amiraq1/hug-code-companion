@echo off
setlocal
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=C:\Users\Aledari\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
echo Building Web App...
call npm run build
echo Syncing Capacitor Android...
call npx cap sync android
cd /d D:\hug-code-companion\android
echo Building Android Release APK...
call gradlew.bat assembleRelease --console=plain
cd ..
echo Done!
exit /b %errorlevel%
