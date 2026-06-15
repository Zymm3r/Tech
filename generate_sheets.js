const XLSX = require("xlsx");
const fs = require("fs");

const technicians = [
  { id: "boy", name: "พี่บอย", group: "Group A", active: true },
  { id: "got", name: "พี่ก็อต", group: "Group A", active: true },
  { id: "mhee", name: "พี่มีย์", group: "Group A", active: true },
  { id: "yeans", name: "พี่ยีนส์", group: "Group A", active: true },
  { id: "oy", name: "พี่ออย", group: "Group A", active: true },
  { id: "po", name: "พี่โป้", group: "Group B", active: true },
  { id: "kwad", name: "พี่แขวด", group: "Group B", active: true },
  { id: "chai", name: "พี่ชัย", group: "Group B", active: true },
  { id: "tack", name: "แท็ค", group: "Group C", active: true }
];

const pricingPlans = [
  { plan_id: "high-profit", plan_name: "กำไรสูง", group: "Group A", price: 2400, active: true },
  { plan_id: "high-profit", plan_name: "กำไรสูง", group: "Group B", price: 2000, active: true },
  { plan_id: "high-profit", plan_name: "กำไรสูง", group: "Group C", price: 1500, active: true },
  { plan_id: "medium-profit", plan_name: "กำไรกลาง", group: "Group A", price: 2000, active: true },
  { plan_id: "medium-profit", plan_name: "กำไรกลาง", group: "Group B", price: 1800, active: true },
  { plan_id: "medium-profit", plan_name: "กำไรกลาง", group: "Group C", price: 1500, active: true },
  { plan_id: "flat-rate", plan_name: "ราคาเท่ากัน", group: "Group A", price: 1500, active: true },
  { plan_id: "flat-rate", plan_name: "ราคาเท่ากัน", group: "Group B", price: 1500, active: true },
  { plan_id: "flat-rate", plan_name: "ราคาเท่ากัน", group: "Group C", price: 1500, active: true }
];

const techSheet = XLSX.utils.json_to_sheet(technicians);
const techBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(techBook, techSheet, "Technicians");
XLSX.writeFile(techBook, "public/data/technicians.xlsx");

const planSheet = XLSX.utils.json_to_sheet(pricingPlans);
const planBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(planBook, planSheet, "PricingPlans");
XLSX.writeFile(planBook, "public/data/pricing_plans.xlsx");

console.log("Generated spreadsheets.");
