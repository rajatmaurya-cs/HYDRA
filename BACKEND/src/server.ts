import app from './index'
import { startBackgroundServices } from './services/worker.service';

const PORT = process.env.PORT || 2000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅ `);
  startBackgroundServices().catch((err) =>
    console.error("Failed to start background webhook worker services:", err)
  );
});