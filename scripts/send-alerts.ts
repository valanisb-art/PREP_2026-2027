import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { entregables54Gantt } from "../src/data/entregables54Gantt";
import * as fs from "fs";
import "dotenv/config";

// Initialize Supabase client using env variables from Github Secrets
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const resendApiKey = process.env.RESEND_API_KEY || "";

if (!supabaseUrl || !supabaseKey || !resendApiKey) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendApiKey);

function generateGoogleCalendarLink(title: string, dateStr: string) {
  const dateObj = new Date(dateStr + "T09:00:00Z"); // Set to 9 AM UTC
  
  const startStr = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endObj = new Date(dateObj.getTime() + 60 * 60 * 1000); // +1 hour
  const endStr = endObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Entrega PREP: ' + title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent('Fecha límite para este entregable del PREP.')}`;
}

async function main() {
  try {
    console.log("Fetching data from Supabase...");
    
    // 1. Fetch statuses and activities
    const { data: statusData } = await supabase.from('activity_status').select('*');
    const { data: prepActs } = await supabase.from('prep_activities').select('*');
    const { data: subActs } = await supabase.from('sub_activities').select('*');
    
    const statusMap = new Map();
    if (statusData) {
      statusData.forEach(s => {
        statusMap.set(s.activity_id, s.status);
      });
    }

    const unifiedActivities = (prepActs || []).map(a => ({
      actividad: a.actividad,
      status: statusMap.get(a.id) || a.status
    }));
    
    (subActs || []).forEach(s => {
       unifiedActivities.push({
         actividad: s.actividad,
         status: statusMap.get(s.id) || s.status
       });
    });

    console.log("Evaluating 54 entregables...");
    // 2. Match with 54 entregables
    const upcoming: any[] = [];
    const today = new Date();
    // Use GMT-6 for Mexico Time approximation for today's date
    today.setHours(today.getHours() - 6); 
    
    const thresholdDays = 30; 
    const thresholdDate = new Date(today.getTime() + thresholdDays * 24 * 60 * 60 * 1000);

    for (const ganttItem of entregables54Gantt) {
      if (!ganttItem.fin) continue;
      
      const finDate = new Date(ganttItem.fin + 'T00:00:00');
      
      if (finDate <= thresholdDate) {
        let status = 'Pendiente';
        const cleanDesc = ganttItem.descripcion.trim().toLowerCase();
        
        const match = unifiedActivities.find(ua => ua.actividad.trim().toLowerCase() === cleanDesc);
        if (match) {
          status = match.status;
        }

        if (status !== 'Entregado') {
          const timeDiff = finDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          upcoming.push({
            ...ganttItem,
            status,
            daysLeft: daysDiff
          });
        }
      }
    }

    upcoming.sort((a, b) => new Date(a.fin).getTime() - new Date(b.fin).getTime());

    if (upcoming.length === 0) {
      console.log("No upcoming deliverables. Skipping email.");
      return;
    }

    console.log(`Found ${upcoming.length} upcoming deliverables.`);

    // 3. Load recipients from JSON file
    let recipients: string[] = [];
    try {
      const fileData = fs.readFileSync("alert_emails.json", "utf8");
      recipients = JSON.parse(fileData);
    } catch (err) {
      console.error("Could not read alert_emails.json", err);
      process.exit(1);
    }

    if (!recipients || recipients.length === 0) {
      console.log("No recipients found in alert_emails.json. Skipping email.");
      return;
    }

    // 4. Generate HTML Email
    console.log("Generating email HTML...");
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #c9175b; border-bottom: 2px solid #eee; padding-bottom: 10px;">
          PREP 2027 — Alerta de Próximos Entregables
        </h2>
        <p>Buenos días,</p>
        <p>Los siguientes entregables del PREP (54) están próximos a su fecha de entrega o se encuentran en proceso y requieren atención:</p>
        <div style="margin-top: 20px;">
    `;

    upcoming.slice(0, 10).forEach(item => {
      const isPast = item.daysLeft < 0;
      const daysText = isPast ? `Venció hace ${Math.abs(item.daysLeft)} días` : `Faltan ${item.daysLeft} días`;
      const color = isPast ? '#dc2626' : (item.daysLeft <= 10 ? '#ea580c' : '#16a34a');
      
      const calLink = generateGoogleCalendarLink(item.descripcion, item.fin);

      htmlContent += `
        <div style="background-color: #f8fafc; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
          <h4 style="margin: 0 0 5px 0;">📋 Entregable ${item.no}</h4>
          <p style="margin: 0 0 10px 0; font-size: 14px;">${item.descripcion}</p>
          <div style="font-size: 13px; color: #64748b; margin-bottom: 10px;">
            <strong>📅 Fecha límite:</strong> ${item.fin} <br/>
            <strong>⏰ Estado temporal:</strong> <span style="color: ${color}; font-weight: bold;">${daysText}</span> <br/>
            <strong>📊 Estatus actual:</strong> ${item.status}
          </div>
          <a href="${calLink}" target="_blank" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
            🗓️ Agregar a Google Calendar
          </a>
        </div>
      `;
    });

    htmlContent += `
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          Dashboard de Control PREP 2026-2027<br/>
          Instituto Electoral del Estado de México
        </p>
      </div>
    `;

    // 5. Send Email via Resend
    console.log(`Sending email to: ${recipients.join(", ")}`);
    const data = await resend.emails.send({
      from: 'Dashboard PREP <onboarding@resend.dev>',
      to: recipients,
      subject: `⚠️ PREP 2027 - ${upcoming.length} entregables próximos a vencer`,
      html: htmlContent
    });
    
    console.log("Email sent successfully!", data);
    
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
