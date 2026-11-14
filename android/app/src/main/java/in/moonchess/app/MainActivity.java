package in.moonchess.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Draw behind the status and navigation bars; the page keeps its content
        // clear of them using the safe-area values Capacitor passes in.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
