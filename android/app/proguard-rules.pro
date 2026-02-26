# Keep JS bridge methods referenced via WebView reflection.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Remove verbose Android logs from release bytecode.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
}

# Keep stacktrace line numbers for production crash diagnostics.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
