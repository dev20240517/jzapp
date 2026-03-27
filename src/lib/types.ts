export interface Ledger {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: string;
  ledgerId: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  items?: string[];
  notes?: string;
  imageUrl?: string;
}

export const CATEGORIES = [
  "餐饮",
  "购物",
  "交通",
  "娱乐",
  "居住",
  "医疗",
  "教育",
  "其他",
];
