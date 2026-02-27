package app.lovable.b18996c477644e5c8e878b0ec5e83922;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // [التحسينات الأصلية - Native Optimizations]
        // 1. منع إغلاق الشاشة أثناء جلسات البرمجة العميقة
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // 2. طلب ذاكرة عشوائية (RAM) قصوى للنظام لدعم محرك Monaco
        getApplicationInfo().flags |= android.content.pm.ApplicationInfo.FLAG_LARGE_HEAP;
    }
}
