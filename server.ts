import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as fal from "@fal-ai/serverless-client";
import dotenv from "dotenv";
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Firebase Admin for server-side updates
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Proxy to Fal.ai for video generation
  // We handle this on the server to keep the FAL_KEY secret.
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, style, aspectRatio, jobId } = req.body;
      const falKey = process.env.FAL_KEY;

      if (!falKey || falKey === 'SECRET_FAL_KEY') {
        return res.status(500).json({ 
          error: "FAL_KEY is not configured or still using the default placeholder. Please go to Settings -> Secrets and set your FAL_KEY from fal.ai." 
        });
      }

      if (!jobId) {
        return res.status(400).json({ error: "jobId is required" });
      }

      // Map user style to model-specific prompt additions if needed
      let enhancedPrompt = prompt;
      if (style === '2D Anime') enhancedPrompt += ", high quality 2d anime style, vibrant colors";
      if (style === '3D Pixar-style') enhancedPrompt += ", pixar style 3d render, cute character, cinematic lighting";
      if (style === 'Classic Comic') enhancedPrompt += ", classic american comic book style, bold lines, halftone";

      // Use hunyuan-video which is a modern, high-quality model
      console.log(`Starting generation for job ${jobId}: "${enhancedPrompt}" with ratio: ${aspectRatio}`);
      
      // Tracking last update time to throttle Firestore writes and save quota
      let lastFirestoreUpdate = 0;
      const THROTTLE_MS = 3000; // Only update every 3 seconds

      const result = await fal.subscribe("fal-ai/hunyuan-video", {
        input: {
          prompt: enhancedPrompt,
          aspect_ratio: aspectRatio,
        },
        logs: true,
        onQueueUpdate: async (update) => {
          const now = Date.now();
          const status = update.status.toLowerCase();
          const isFinalStatus = status === 'completed' || status === 'failed';
          
          // Throttle: only update if it's been THROTTLE_MS or if it's a final state
          if (!isFinalStatus && (now - lastFirestoreUpdate < THROTTLE_MS)) {
            return;
          }
          
          lastFirestoreUpdate = now;
          console.log(`Job ${jobId} update:`, update.status);
          
          let progress = 0;
          if (update.status === 'IN_PROGRESS' || update.status === 'COMPLETED') {
            progress = update.status === 'COMPLETED' ? 100 : 50; // Simple fallback
          }

          try {
            await db.collection('videos').doc(jobId).update({
              status: status === 'in_progress' ? 'processing' : status,
              progress: progress,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (e) {
            console.error("Failed to update firestore progress:", e);
          }
        },
      });

      console.log(`Job ${jobId} complete:`, result);
      res.json(result);
    } catch (error: any) {
      console.error("Fal.ai Error:", error);
      
      // Handle Specific Unauthorized Error
      if (error.message?.includes('Unauthorized') || error.status === 401) {
        return res.status(401).json({ 
          error: "Unauthorized: Your FAL_KEY appears to be invalid or expired. Please check your key at fal.ai and update it in Settings -> Secrets." 
        });
      }

      res.status(500).json({ error: error.message || "Failed to generate video" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
