package in.moonchess.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Called after the app theme is in place, so the area behind the
        // status and navigation bars is MoonChess dark blue, never the launch image.
        EdgeToEdge.enable(this);
    }
}
