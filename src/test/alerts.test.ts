import { describe, it, expect } from "vitest";
import { computeEntregableProgress, buildAlerts, AlertActivity } from "@/lib/alerts";

describe("computeEntregableProgress (avance por hojas, opción B)", () => {
  it("devuelve null cuando no hay subactividades", () => {
    expect(computeEntregableProgress([])).toBeNull();
  });

  it("cuenta solo hojas: 1 de 2 marcadas = 50%", () => {
    const subs = [
      { entregable: "1.1", checked: true },
      { entregable: "1.2", checked: false },
    ];
    expect(computeEntregableProgress(subs)).toBe(50);
  });

  it("ignora los padres (nivel 2) y cuenta solo el último nivel (hojas)", () => {
    // 4.1 es padre (tiene hijos), no cuenta. Hojas: 4.1.1, 4.1.2, 4.1.3
    const subs = [
      { entregable: "4.1", checked: true },
      { entregable: "4.1.1", checked: true },
      { entregable: "4.1.2", checked: true },
      { entregable: "4.1.3", checked: false },
    ];
    // 2 de 3 hojas marcadas = 67%
    expect(computeEntregableProgress(subs)).toBe(67);
  });

  it("todas las hojas marcadas = 100%", () => {
    const subs = [
      { entregable: "1.1", checked: true },
      { entregable: "1.1.1", checked: true },
      { entregable: "1.1.2", checked: true },
    ];
    // hojas: 1.1.1, 1.1.2 (1.1 es padre) -> 2/2 = 100
    expect(computeEntregableProgress(subs)).toBe(100);
  });

  it("ninguna hoja marcada = 0%", () => {
    const subs = [
      { entregable: "2.1", checked: false },
      { entregable: "2.2", checked: false },
    ];
    expect(computeEntregableProgress(subs)).toBe(0);
  });
});

describe("buildAlerts (exclusión de lo marcado / completado)", () => {
  const today = new Date("2026-09-24T00:00:00");

  it("NO genera alerta para una subtarea marcada aunque esté vencida", () => {
    const act: AlertActivity = {
      id: 4,
      entregable: "4",
      actividad: "Entregable 4",
      termino: "2027-11-11", // futuro lejano -> el nivel 1 no alerta
      status: "Pendiente",
      areaResponsable: "CG",
      subActivities: [
        { entregable: "4.1.1", termino: "2026-09-16", checked: true }, // vencida pero marcada
        { entregable: "4.1.2", termino: "2026-09-21", checked: false }, // vencida no marcada
      ],
    };
    const alerts = buildAlerts([act], today);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].activity.entregable).toBe("4.1.2");
    expect(alerts[0].type).toBe("danger");
  });

  it("excluye por completo un entregable al 100% (todas las hojas marcadas), aunque esté vencido", () => {
    const act: AlertActivity = {
      id: 1,
      entregable: "1",
      actividad: "Entregable 1",
      termino: "2026-09-11", // vencido
      status: "Pendiente",
      subActivities: [{ entregable: "1.1", termino: "2026-09-01", checked: true }],
    };
    expect(buildAlerts([act], today)).toHaveLength(0);
  });

  it("excluye un entregable con status Entregado", () => {
    const act: AlertActivity = {
      id: 2,
      entregable: "2",
      actividad: "Entregable 2",
      termino: "2026-09-11",
      status: "Entregado",
      subActivities: [],
    };
    expect(buildAlerts([act], today)).toHaveLength(0);
  });

  it("marca 'vence pronto' (warning) una subtarea no marcada a menos de 7 días", () => {
    const act: AlertActivity = {
      id: 5,
      entregable: "5",
      actividad: "Entregable 5",
      termino: "2027-06-01", // futuro lejano
      status: "Pendiente",
      subActivities: [{ entregable: "5.1", termino: "2026-09-28", checked: false }], // en 4 días
    };
    const alerts = buildAlerts([act], today);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("warning");
    expect(alerts[0].daysInfo).toBe(4);
  });
});
