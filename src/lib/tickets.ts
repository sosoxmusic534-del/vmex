export const TICKET_CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Billing & payments" },
  { value: "technical", label: "Connection problem" },
  { value: "config", label: "Config / setup help" },
];

export const categoryLabel = (category: string) => TICKET_CATEGORIES.find((item) => item.value === category)?.label ?? category;
