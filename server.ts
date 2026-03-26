import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("SUPABASE_URL or SUPABASE_ANON_KEY is missing. Backend will run in mock mode.");
}

// API Routes
app.get("/api/schedules", async (req, res) => {
  if (!supabase) {
    return res.json([]);
  }
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/schedules", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { title, startTime, priority, recurring } = req.body;
  const { data, error } = await supabase
    .from("schedules")
    .insert([{ 
      title, 
      start_time: startTime, 
      priority, 
      recurring,
      completed: false
    }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.patch("/api/schedules/:id", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { id } = req.params;
  const updates = req.body;
  
  // Map frontend camelCase to backend snake_case if needed
  const dbUpdates: any = {};
  if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.recurring !== undefined) dbUpdates.recurring = updates.recurring;

  const { data, error } = await supabase
    .from("schedules")
    .update(dbUpdates)
    .eq("id", id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete("/api/schedules/:id", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { id } = req.params;
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
