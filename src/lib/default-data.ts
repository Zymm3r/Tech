import { Catalog } from "@/types";

export const DEFAULT_CATALOG: Catalog = {
  technicians: [
    { id: "boy", name: "พี่บอย", group: "Group A", basePrice: 2400, active: true },
    { id: "got", name: "พี่ก็อต", group: "Group A", basePrice: 2400, active: true },
    { id: "mhee", name: "พี่มีย์", group: "Group A", basePrice: 2400, active: true },
    { id: "yeans", name: "พี่ยีนส์", group: "Group A", basePrice: 2400, active: true },
    { id: "oy", name: "พี่ออย", group: "Group A", basePrice: 2000, active: true },
    { id: "po", name: "พี่โป้", group: "Group B", basePrice: 2000, active: true },
    { id: "kwad", name: "พี่แขวด", group: "Group B", basePrice: 2800, active: true },
    { id: "chai", name: "พี่ชัย", group: "Group B", basePrice: 2000, active: true },
    { id: "tack", name: "แท็ค", group: "Group C", basePrice: 1500, active: true }
  ],
  multipliers: [
    { id: "safety-normal", category: "ความปลอดภัย", name: "ปกติ", multiplier: 1.0, active: true },
    { id: "safety-height", category: "ความปลอดภัย", name: "สูงเกิน 3 เมตร / นั่งร้าน", multiplier: 1.3, active: true },
    { id: "safety-confined", category: "ความปลอดภัย", name: "ที่อับอากาศ / เสี่ยงภัย", multiplier: 1.5, active: true },
    { id: "job-software", category: "ลักษณะงาน", name: "Setup Software", multiplier: 1.4, active: true },
    { id: "site-ready", category: "สภาพหน้างาน", name: "หน้างานพร้อม", multiplier: 1.0, active: true },
    { id: "site-check", category: "สภาพหน้างาน", name: "ไล่เช็ค ไม่มีแบบ / ความลับสูง", multiplier: 1.3, active: true }
  ],
  pricingPlans: [
    { plan_id: "high-profit", plan_name: "กำไรสูง", group: "Group A", price: 2400, active: true },
    { plan_id: "high-profit", plan_name: "กำไรสูง", group: "Group B", price: 2000, active: true },
    { plan_id: "high-profit", plan_name: "กำไรสูง", group: "Group C", price: 1500, active: true },
    { plan_id: "medium-profit", plan_name: "กำไรกลาง", group: "Group A", price: 2000, active: true },
    { plan_id: "medium-profit", plan_name: "กำไรกลาง", group: "Group B", price: 1800, active: true },
    { plan_id: "medium-profit", plan_name: "กำไรกลาง", group: "Group C", price: 1500, active: true },
    { plan_id: "flat-rate", plan_name: "ราคาเท่ากัน", group: "Group A", price: 1500, active: true },
    { plan_id: "flat-rate", plan_name: "ราคาเท่ากัน", group: "Group B", price: 1500, active: true },
    { plan_id: "flat-rate", plan_name: "ราคาเท่ากัน", group: "Group C", price: 1500, active: true }
  ]
};
