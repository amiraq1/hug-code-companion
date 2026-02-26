# RELEASE_READY_APK

## المتطلبات

- JDK (JAVA_HOME)
- Android SDK + Build Tools (ANDROID_HOME / ANDROID_SDK_ROOT)
- مفاتيح توقيع حقيقية:
  - `android/keystore.properties` (غير مرفوع إلى Git)
  - ملف keystore (`.jks` أو `.keystore`)

## إعداد التوقيع

1. انسخ `android/keystore.properties.example` إلى `android/keystore.properties`.
2. حدّث القيم الحقيقية:

```properties
storeFile=../secure/upload-keystore.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
```

3. احفظ ملف keystore في مسار آمن خارج Git.

## أوامر البناء

- Debug:

```bat
build_android.cmd
```

- Release (APK + AAB + zipalign verify + signature verify + size report):

```bat
build_android_release.cmd
```

## نواتج التصدير

- APK: `android/app/build/outputs/apk/prod/release/`
- AAB: `android/app/build/outputs/bundle/prodRelease/`
- تقرير الحجم: `android/build/reports/release/artifact-size-report.txt`
- نسخة artifacts باسم واضح: `artifacts/android/`

## CI/CD (GitHub Actions)

الملف: `.github/workflows/android-release.yml`

الأسرار المطلوبة:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

متغيرات اختيارية:
- `APP_VERSION_CODE`
- `APP_VERSION_NAME`
