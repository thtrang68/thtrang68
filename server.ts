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
const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Basic validation to prevent Supabase SDK from throwing and crashing the server
  if (!supabaseUrl.startsWith("http")) {
    console.error("Invalid SUPABASE_URL: Must start with http:// or https://");
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
};

// Vite middleware for development
async function startServer() {
  const vite = process.env.NODE_ENV !== "production" 
    ? await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      })
    : null;

  // API Routes
  app.get("/api/health", (req, res) => {
    const supabase = getSupabase();
    res.json({ status: "ok", supabase: !!supabase });
  });

  app.get("/api/schedules", async (req, res) => {
    console.log("GET /api/schedules");
    const supabase = getSupabase();
    if (!supabase) {
      return res.json([]);
    }
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    console.log("POST /api/schedules", req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    try {
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

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No data returned from insert");
      res.json(data[0]);
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/schedules/:id", async (req, res) => {
    console.log("PATCH /api/schedules", req.params.id, req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    try {
      const { id } = req.params;
      const updates = req.body;
      
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

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No data returned from update");
      res.json(data[0]);
    } catch (error: any) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    console.log("DELETE /api/schedules", req.params.id);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (vite) {
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
